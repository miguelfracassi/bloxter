// Uso: TEST_DATABASE_URL=postgres://user:senha@127.0.0.1:5432/banco node test/social.js
// Testa a colaboração em posts (convite pela conversa, aceite e perfil). Mesmo esquema do run.js:
// sobe o handler REAL (api/index.js) e troca só o driver do Neon por pg local.
const Module = require('module'), http = require('http'), path = require('path');
const { Pool } = require(path.join(__dirname, '..', 'node_modules', 'pg'));
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgres://t:t@127.0.0.1:5432/bx';
process.env.JWT_SECRET = 'segredo-de-teste-1234567890';
process.env.NODE_ENV = 'development';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const origLoad = Module._load;
Module._load = function (req, ...r) {
  if (req === '@neondatabase/serverless') return { neon: () => (s, ...v) => pool.query(s.reduce((a, p, i) => a + '$' + i + p), v).then((x) => x.rows) };
  return origLoad.call(this, req, ...r);
};
const handler = require(path.join(__dirname, '..', 'api', 'index.js'));
const server = http.createServer(async (req, res) => {
  let raw = ''; for await (const c of req) raw += c;
  req.body = raw ? (() => { try { return JSON.parse(raw); } catch { return raw; } })() : undefined;
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (o) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(o)); };
  try { await handler(req, res); } catch (e) { res.statusCode = 500; res.end(String(e)); }
}).listen(3113, async () => {
  const BASE = 'http://127.0.0.1:3113/api';
  let pass = 0, fail = 0;
  const call = async (p, { method = 'GET', body, headers = {}, cookie } = {}) => {
    const r = await fetch(BASE + p, { method, headers: { 'Content-Type': 'application/json', ...(cookie ? { cookie } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined });
    const sc = r.headers.get('set-cookie');
    return { s: r.status, j: await r.json().catch(() => ({})), cookie: sc ? sc.split(';')[0] : null };
  };
  const t = (name, ok, extra = '') => { ok ? pass++ : fail++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} ${ok ? '' : extra}`); };
  const reg = (u) => call('/auth/register', { method: 'POST', body: { name: u, username: u, email: `${u}@x.com`, password: 'senha1234', accept_terms: true } });
  await call('/site/status');
  await pool.query("UPDATE site_settings SET setting_value='true' WHERE setting_key='access_open'");
  const stamp = Date.now().toString(36).slice(-5);
  const names = ['ana', 'bia', 'caio', 'dani', 'edu', 'fe', 'gui'].map((n) => `${n}${stamp}`);
  const us = []; for (const n of names) us.push(await reg(n));
  t('cadastro de 7 usuários', us.every((u) => u.s === 201));
  const [A, B, C, D, E, F, G] = us; const [nA, nB, nC, nD, nE, nF, nG] = names;

  // ---- validações ----
  t('mais de 5 colaboradores -> 400', (await call('/posts', { method: 'POST', cookie: A.cookie, body: { body: 'x', collaborators: [nB, nC, nD, nE, nF, nG] } })).j.error === 'too_many_collabs');
  t('convidar a si mesmo -> 400', (await call('/posts', { method: 'POST', cookie: A.cookie, body: { body: 'x', collaborators: [nA] } })).j.error === 'collab_self');
  t('usuário inexistente -> 404', (await call('/posts', { method: 'POST', cookie: A.cookie, body: { body: 'x', collaborators: ['naoexiste999'] } })).j.error === 'collab_user_not_found');
  const cnt0 = await pool.query('SELECT count(*)::int AS n FROM posts WHERE user_id = (SELECT id FROM users WHERE username=$1)', [nA]);
  t('falha de validação não publica o post', cnt0.rows[0].n === 0, JSON.stringify(cnt0.rows));

  // ---- convite ----
  const p = await call('/posts', { method: 'POST', cookie: A.cookie, body: { body: 'post em dupla', collaborators: [nB, nC, '@' + nB.toUpperCase()] } });
  t('post com 2 colaboradores (duplicado ignorado) -> 201', p.s === 201, JSON.stringify(p.j));
  const pid = p.j.post.id;
  t('antes de aceitar o post não lista colaboradores', (p.j.post.collaborators || []).length === 0);
  const convB = await call(`/messages/${nA}`, { cookie: B.cookie });
  const mB = convB.j.messages.find((m) => m.collab);
  t('Bia recebe o convite como mensagem na conversa', !!mB && mB.collab.status === 'pending' && mB.collab.invited_me === true && mB.collab.post_id === pid, JSON.stringify(convB.j));
  const convA = await call(`/messages/${nB}`, { cookie: A.cookie });
  t('Ana vê o convite como enviado por ela', convA.j.messages.some((m) => m.collab && m.mine && m.collab.invited_me === false));
  t('conversa da Bia aparece na lista', (await call('/conversations', { cookie: B.cookie })).j.conversations.some((c) => c.user.username === nA));

  // ---- perfil antes de aceitar ----
  t('antes de aceitar: perfil da Bia sem o post', (await call(`/users/${nB}/posts`, { cookie: A.cookie })).j.posts.length === 0);

  // ---- permissões ----
  t('quem não foi convidado não responde -> 404', (await call(`/collabs/${mB.collab.id}/accept`, { method: 'POST', cookie: C.cookie })).s === 404);
  t('quem convidou não aceita pelo convidado -> 404', (await call(`/collabs/${mB.collab.id}/accept`, { method: 'POST', cookie: A.cookie })).s === 404);
  t('sem login -> 401', (await call(`/collabs/${mB.collab.id}/accept`, { method: 'POST' })).s === 401);

  // ---- aceitar ----
  const acc = await call(`/collabs/${mB.collab.id}/accept`, { method: 'POST', cookie: B.cookie });
  t('Bia aceita', acc.s === 200 && acc.j.status === 'accepted');
  t('aceitar de novo é idempotente', (await call(`/collabs/${mB.collab.id}/accept`, { method: 'POST', cookie: B.cookie })).j.status === 'accepted');
  const profB = await call(`/users/${nB}/posts`, { cookie: A.cookie });
  t('o post aparece no perfil da Bia', profB.j.posts.length === 1 && profB.j.posts[0].id === pid && profB.j.posts[0].user.username === nA, JSON.stringify(profB.j));
  t('o post mostra a Bia como colaboradora (e não a Caio, que não respondeu)', profB.j.posts[0].collaborators.length === 1 && profB.j.posts[0].collaborators[0].username === nB);
  t('perfil da Ana continua com o post', (await call(`/users/${nA}/posts`, { cookie: B.cookie })).j.posts.some((x) => x.id === pid));
  t('perfil do Caio (pendente) não tem o post', (await call(`/users/${nC}/posts`, { cookie: A.cookie })).j.posts.length === 0);
  t('conversa mostra status aceito', (await call(`/messages/${nB}`, { cookie: A.cookie })).j.messages.some((m) => m.collab && m.collab.status === 'accepted'));

  // ---- recusar e sair ----
  const convC = await call(`/messages/${nA}`, { cookie: C.cookie });
  const mC = convC.j.messages.find((m) => m.collab);
  t('Caio recusa', (await call(`/collabs/${mC.collab.id}/decline`, { method: 'POST', cookie: C.cookie })).j.status === 'declined');
  t('depois de recusar não dá para aceitar -> 409', (await call(`/collabs/${mC.collab.id}/accept`, { method: 'POST', cookie: C.cookie })).s === 409);
  t('perfil do Caio segue sem o post', (await call(`/users/${nC}/posts`, { cookie: A.cookie })).j.posts.length === 0);
  t('Bia sai da colaboração', (await call(`/collabs/${mB.collab.id}/decline`, { method: 'POST', cookie: B.cookie })).j.status === 'declined');
  t('após sair, o post some do perfil da Bia', (await call(`/users/${nB}/posts`, { cookie: A.cookie })).j.posts.length === 0);

  // ---- 5 colaboradores e post sem colaboração ----
  const p5 = await call('/posts', { method: 'POST', cookie: A.cookie, body: { body: 'cinco', collaborators: [nB, nC, nD, nE, nF] } });
  t('5 colaboradores é permitido', p5.s === 201);
  const plain = await call('/posts', { method: 'POST', cookie: A.cookie, body: { body: 'normal' } });
  t('post sem colaboradores segue normal', plain.s === 201 && (plain.j.post.collaborators || []).length === 0);
  const feed = await call('/feed?tab=all', { cookie: A.cookie });
  t('feed continua funcionando', feed.s === 200 && Array.isArray(feed.j.posts), JSON.stringify(feed.j).slice(0, 200));

  // ---- apagar o post ----
  const dE = (await call(`/messages/${nA}`, { cookie: E.cookie })).j.messages.find((m) => m.collab);
  await call(`/collabs/${dE.collab.id}/accept`, { method: 'POST', cookie: E.cookie });
  t('Edu aceita o post de 5', (await call(`/users/${nE}/posts`, { cookie: A.cookie })).j.posts.some((x) => x.id === p5.j.post.id));
  await call(`/posts/${p5.j.post.id}`, { method: 'DELETE', cookie: A.cookie });
  const rest = await pool.query('SELECT count(*)::int AS n FROM post_collabs WHERE post_id=$1', [p5.j.post.id]);
  t('apagar o post remove os convites', rest.rows[0].n === 0);
  t('mensagem do convite continua legível sem o post', (await call(`/messages/${nA}`, { cookie: E.cookie })).s === 200);
  t('colaborador não consegue apagar post alheio', (await call(`/posts/${pid}`, { method: 'DELETE', cookie: C.cookie })).s === 404);

  console.log(`\n${pass} passaram, ${fail} falharam`);
  process.exit(fail ? 1 : 0);
});
