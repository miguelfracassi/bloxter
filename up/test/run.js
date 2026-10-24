// Sobe o handler REAL (api/index.js) num servidor HTTP local; só o driver do Neon é trocado por pg local.
const Module = require('module'), http = require('http'), crypto = require('crypto');
const { Pool } = require('/home/claude/ainnnnn/node_modules/pg');
process.env.DATABASE_URL = 'postgres://t:t@127.0.0.1:5432/bx';
process.env.JWT_SECRET = 'segredo-de-teste-1234567890';
process.env.NODE_ENV = 'development';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const origLoad = Module._load;
Module._load = function (req, ...r) {
  if (req === '@neondatabase/serverless') return { neon: () => (s, ...v) => pool.query(s.reduce((a, p, i) => a + '$' + i + p), v).then((x) => x.rows) };
  return origLoad.call(this, req, ...r);
};
const handler = require('/home/claude/ainnnnn/api/index.js');
const server = http.createServer(async (req, res) => {
  let raw = ''; for await (const c of req) raw += c;
  req.body = raw ? (() => { try { return JSON.parse(raw); } catch { return raw; } })() : undefined;
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (o) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(o)); };
  try { await handler(req, res); } catch (e) { res.statusCode = 500; res.end(String(e)); }
}).listen(3111, async () => {
  const B = 'http://127.0.0.1:3111/api';
  let pass = 0, fail = 0;
  const call = async (path, { method = 'GET', body, headers = {}, cookie } = {}) => {
    const r = await fetch(B + path, { method, headers: { 'Content-Type': 'application/json', ...(cookie ? { cookie } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined });
    const sc = r.headers.get('set-cookie');
    return { s: r.status, j: await r.json().catch(() => ({})), cookie: sc ? sc.split(';')[0] : null };
  };
  const t = (name, ok, extra = '') => { ok ? pass++ : fail++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} ${ok ? '' : extra}`); };

  await call('/site/status');
  await pool.query("UPDATE site_settings SET setting_value='true' WHERE setting_key='access_open'");
  // dono do bot + jogador
  const o = await call('/auth/register', { method: 'POST', body: { name: 'Dono', username: 'dono', email: 'dono@x.com', password: 'senha1234' } });
  const p = await call('/auth/register', { method: 'POST', body: { name: 'Jogador', username: 'jogador', email: 'j@x.com', password: 'senha1234' } });
  t('cadastro dono e jogador', o.s === 201 && p.s === 201, JSON.stringify([o.j, p.j]));
  // app + chave de bot + missões
  const app = await call('/developers/apps', { method: 'POST', cookie: o.cookie, body: { name: 'Meu Bot', redirect_uri: 'http://localhost:9000/cb' } });
  const cid = app.j.app.client_id, secret = app.j.client_secret;
  t('criar app (client_id/secret)', app.s === 201 && cid && secret);
  const k = await call(`/developers/apps/${cid}/bot-keys`, { method: 'POST', cookie: o.cookie, body: { name: 'bot-discord' } });
  const KEY = k.j.api_key;
  t('criar API key do bot', k.s === 201 && KEY.startsWith('bx_bot_'));
  const stored = (await pool.query('SELECT key_hash FROM bot_keys')).rows[0].key_hash;
  t('chave guardada só como hash', stored === crypto.createHash('sha256').update(KEY).digest('hex') && stored !== KEY);
  const outro = await call(`/developers/apps/${cid}/bot-keys`, { method: 'POST', cookie: p.cookie, body: {} });
  t('outro usuário NÃO cria chave no app alheio', outro.s === 404);
  const semLogin = await call(`/developers/apps/${cid}/missions`, { method: 'POST', body: { mission_key: 'x', title: 'xx', reward: 5 } });
  t('sem login não cria missão', semLogin.s === 401);
  const m1 = await call(`/developers/apps/${cid}/missions`, { method: 'POST', cookie: o.cookie, body: { mission_key: 'entrar', title: 'Entrar no servidor', reward: 10 } });
  const m2 = await call(`/developers/apps/${cid}/missions`, { method: 'POST', cookie: o.cookie, body: { mission_key: 'convidar', title: 'Convidar amigo', reward: 50, repeatable: true } });
  const bad = await call(`/developers/apps/${cid}/missions`, { method: 'POST', cookie: o.cookie, body: { mission_key: 'ouro', title: 'Muito', reward: 5000 } });
  t('criar missões', m1.s === 201 && m2.s === 201);
  t('recompensa >50 recusada', bad.s === 400 && bad.j.error === 'invalid_reward');

  // jogador faz "login no bot" = OAuth + PKCE
  const verifier = crypto.randomBytes(48).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  const au = await call('/oauth/authorize', { method: 'POST', cookie: p.cookie, body: { response_type: 'code', client_id: cid, redirect_uri: 'http://localhost:9000/cb', state: 'abc', code_challenge: challenge, code_challenge_method: 'S256', scope: 'profile' } });
  const tk = await call('/oauth/token', { method: 'POST', body: { grant_type: 'authorization_code', client_id: cid, client_secret: secret, code: au.j.code, redirect_uri: 'http://localhost:9000/cb', code_verifier: verifier } });
  const UT = tk.j.access_token;
  t('login do jogador via OAuth (access_token)', au.s === 200 && !!UT);

  const H = { 'X-API-Key': KEY, 'X-User-Token': UT };
  t('sem API key -> 401', (await call('/bot/missions')).s === 401);
  t('API key falsa -> 401', (await call('/bot/missions', { headers: { 'X-API-Key': 'bx_bot_falsa' } })).s === 401);
  const ls = await call('/bot/missions', { headers: { 'X-API-Key': KEY } });
  t('bot lista missões', ls.s === 200 && ls.j.missions.length === 2);
  t('sem login do jogador -> 401', (await call('/bot/missions/complete', { method: 'POST', headers: { 'X-API-Key': KEY }, body: { mission_key: 'entrar' } })).s === 401);
  t('token de usuário falso -> 401', (await call('/bot/missions/complete', { method: 'POST', headers: { 'X-API-Key': KEY, 'X-User-Token': 'falso' }, body: { mission_key: 'entrar' } })).s === 401);
  const me0 = await call('/bot/me', { headers: H });
  t('bot vê o jogador (0 seguidores)', me0.j.username === 'jogador' && me0.j.followers === 0, JSON.stringify(me0.j));
  const c1 = await call('/bot/missions/complete', { method: 'POST', headers: H, body: { mission_key: 'entrar' } });
  t('missão "entrar" dá +10', c1.s === 200 && c1.j.reward === 10 && c1.j.followers === 10, JSON.stringify(c1));
  const c1b = await call('/bot/missions/complete', { method: 'POST', headers: H, body: { mission_key: 'entrar' } });
  t('missão única não repete (409)', c1b.s === 409 && c1b.j.error === 'mission_already_completed', JSON.stringify(c1b));
  const c404 = await call('/bot/missions/complete', { method: 'POST', headers: H, body: { mission_key: 'nao-existe' } });
  t('missão inexistente (404)', c404.s === 404);
  // paralelo: 5 requisições simultâneas da missão única de outro tipo -> só 1 vale
  await call(`/developers/apps/${cid}/missions`, { method: 'POST', cookie: o.cookie, body: { mission_key: 'perfil', title: 'Completar perfil', reward: 20 } });
  const par = await Promise.all(Array.from({ length: 6 }, () => call('/bot/missions/complete', { method: 'POST', headers: H, body: { mission_key: 'perfil' } })));
  t('6 pedidos simultâneos: só 1 pago', par.filter((x) => x.s === 200).length === 1 && par.filter((x) => x.s === 409).length === 5, par.map((x) => x.s).join(','));
  // repetível até o teto de 500
  let ok = 0, last;
  for (let i = 0; i < 12; i++) { last = await call('/bot/missions/complete', { method: 'POST', headers: H, body: { mission_key: 'convidar' } }); if (last.s === 200) ok++; }
  t('repetível para no teto (500 por pessoa/app)', ok === 9 && last.s === 409 && last.j.error === 'reward_cap_reached', `ok=${ok} ${JSON.stringify(last)}`);
  const fin = await call('/bot/me', { headers: H });
  t('total final = 10+20+450 = 480', fin.j.followers === 480, JSON.stringify(fin.j));
  const prof = await call('/users/jogador', { cookie: p.cookie });
  console.log('      perfil público mostra followers =', JSON.stringify(prof.j.user ? prof.j.user.followers : prof.j).slice(0, 60));
  // chave revogada
  const del = await call(`/developers/apps/${cid}/bot-keys/${k.j.key.key_prefix}`, { method: 'DELETE', cookie: o.cookie });
  t('revogar chave', del.s === 200 && (await call('/bot/missions', { headers: { 'X-API-Key': KEY } })).s === 401);
  // token de OUTRO app não vale
  console.log(`\n${pass} passaram, ${fail} falharam`);
  process.exit(fail ? 1 : 0);
});
