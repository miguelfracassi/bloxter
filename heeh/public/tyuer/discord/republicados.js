#!/usr/bin/env node
// Bloxter -> Discord: envia para um canal cada post republicado.
// Usa a rota  GET /api/bot/reposts  (ver BOT_API.md). Sem dependências (Node 18+).
//
// Variáveis de ambiente:
//   BLOXTER_API_KEY      (obrigatória) chave bx_bot_... criada em /developers
//   DISCORD_WEBHOOK_URL  (obrigatória) Canal > Editar > Integrações > Webhooks > Copiar URL
//   BLOXTER_URL          padrão https://bloxter.sbs
//   BLOXTER_USERNAME     opcional: só republicados desse perfil (ex.: ana). Vazio = o site todo
//   POLL_SECONDS         padrão 30
//   BACKFILL             quantos republicados antigos enviar na PRIMEIRA execução (padrão 0)
//   STATE_FILE           padrão ./.republicados-state.json (guarda o último id enviado)
// Uso:  node discord/republicados.js          (fica rodando)
//       node discord/republicados.js --once   (uma passada e sai; bom para cron)
const fs = require('node:fs');

const BASE = String(process.env.BLOXTER_URL || 'https://bloxter.sbs').replace(/\/+$/, '');
const KEY = process.env.BLOXTER_API_KEY;
const HOOK = process.env.DISCORD_WEBHOOK_URL;
const USER = String(process.env.BLOXTER_USERNAME || '').replace(/^@/, '').toLowerCase();
const POLL = Math.max(10, parseInt(process.env.POLL_SECONDS, 10) || 30) * 1000;
const BACKFILL = Math.max(0, parseInt(process.env.BACKFILL, 10) || 0);
const STATE = process.env.STATE_FILE || './.republicados-state.json';
const ONCE = process.argv.includes('--once');

if (!KEY || !HOOK) {
  console.error('Faltam BLOXTER_API_KEY e/ou DISCORD_WEBHOOK_URL.');
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const abs = (u) => (u ? (u.startsWith('http') ? u : BASE + u) : undefined);
const cut = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

const loadState = () => { try { return JSON.parse(fs.readFileSync(STATE, 'utf8')); } catch { return null; } };
const saveState = (lastId) => fs.writeFileSync(STATE, JSON.stringify({ lastId }));

async function fetchReposts() {
  const qs = new URLSearchParams({ limit: '50' });
  if (USER) qs.set('username', USER);
  const res = await fetch(`${BASE}/api/bot/reposts?${qs}`, { headers: { 'X-API-Key': KEY } });
  if (!res.ok) throw new Error(`Bloxter respondeu ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()).reposts; // do mais novo para o mais antigo
}

function toEmbed(r) {
  const who = r.reposted_by, p = r.post;
  return {
    author: { name: `${who.name} (@${who.username}) republicou`, url: `${BASE}/account?u=${encodeURIComponent(who.username)}`, icon_url: abs(who.avatar) },
    title: `${p.user.name} (@${p.user.username})${p.user.verified ? ' ✔️' : ''}`,
    url: `${BASE}/account?u=${encodeURIComponent(p.user.username)}`,
    description: cut(p.body, 4000),
    color: 0x111111,
    fields: [
      { name: '❤️ Curtidas', value: String(p.likes), inline: true },
      { name: '💬 Comentários', value: String(p.comments), inline: true },
      { name: '🔁 Republicações', value: String(p.reposts), inline: true },
    ],
    footer: { text: 'bloxter.sbs' },
    timestamp: new Date(r.created_at).toISOString(),
  };
}

async function sendToDiscord(embed) {
  for (let tries = 0; tries < 5; tries++) {
    const res = await fetch(HOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // allowed_mentions vazio: um @everyone dentro de um post nunca vira menção no Discord.
      body: JSON.stringify({ username: 'Bloxter', embeds: [embed], allowed_mentions: { parse: [] } }),
    });
    if (res.status === 429) { const j = await res.json().catch(() => ({})); await sleep(Math.ceil((j.retry_after || 1) * 1000) + 100); continue; }
    if (!res.ok) throw new Error(`Discord respondeu ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return;
  }
  throw new Error('Discord: limite de envios, tente de novo mais tarde');
}

async function pass() {
  const reposts = await fetchReposts();
  const state = loadState();
  if (!state) {
    // Primeira execução: não despeja o histórico inteiro no canal.
    const first = reposts.slice(0, BACKFILL).reverse();
    for (const r of first) { await sendToDiscord(toEmbed(r)); await sleep(1000); }
    saveState(reposts.length ? reposts[0].id : 0);
    console.log(`Início: marcado o último id (${reposts.length ? reposts[0].id : 0}); ${first.length} enviados do histórico.`);
    return;
  }
  const fresh = reposts.filter((r) => r.id > state.lastId).reverse(); // mais antigos primeiro
  let last = state.lastId;
  for (const r of fresh) {
    await sendToDiscord(toEmbed(r));
    last = r.id;
    saveState(last); // salva a cada envio: se cair no meio, não repete
    await sleep(1000);
  }
  if (fresh.length) console.log(`${fresh.length} republicado(s) enviado(s).`);
}

(async () => {
  do {
    try { await pass(); } catch (e) { console.error('Erro:', e.message); if (ONCE) process.exitCode = 1; }
    if (!ONCE) await sleep(POLL);
  } while (!ONCE);
})();
