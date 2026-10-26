// Uso: TEST_DATABASE_URL=postgres://user:senha@127.0.0.1:5432/banco node test/social.js
// Testa comentários, republicados e a API de bots. Mesmo esquema do run.js:
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
}).listen(3112, async () => {
  const B = 'http://127.0.0.1:3112/api';
  let pass = 0, fail = 0;
  const call = async (p, { method = 'GET', body, headers = {}, cookie } = {}) => {
    const r = await fetch(B + p, { method, headers: { 'Content-Type': 'application/json', ...(cookie ? { cookie } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined });
    const sc = r.headers.get('set-cookie');
    return { s: r.status, j: await r.json().catch(() => ({})), cookie: sc ? sc.split(';')[0] : null };
  };
  const t = (name, ok, extra = '') => { ok ? pass++ : fail++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} ${ok ? '' : extra}`); };
  const reg = (u) => call('/auth/register', { method: 'POST', body: { name: u, username: u, email: `${u}@x.com`, password: 'senha1234', accept_terms: true } });

  await call('/site/status');
  await pool.query("UPDATE site_settings SET setting_value='true' WHERE setting_key='access_open'");
  const stamp = Date.now().toString(36).slice(-5);
  const [A, Bu, Cu] = [`ana${stamp}`, `bia${stamp}`, `caio${stamp}`];
  const a = await reg(A), b = await reg(Bu), c = await reg(Cu);
  t('cadastro de 3 usuários', a.s === 201 && b.s === 201 && c.s === 201, JSON.stringify([a.j, b.j, c.j]));

  const post = await call('/posts', { method: 'POST', cookie: a.cookie, body: { body: 'post da ana #teste' } });
  const pid = post.j.post.id;
  t('post novo vem com contadores zerados', post.s === 201 && post.j.post.comments === 0 && post.j.post.reposts === 0 && post.j.post.reposted === false, JSON.stringify(post.j));

  // ---- comentários ----
  t('comentar sem login -> 401', (await call(`/posts/${pid}/comments`, { method: 'POST', body: { body: 'oi' } })).s === 401);
  t('comentário vazio -> 400', (await call(`/posts/${pid}/comments`, { method: 'POST', cookie: b.cookie, body: { body: '   ' } })).j.error === 'comment_empty');
  t('post inexistente -> 404', (await call('/posts/999999/comments', { method: 'POST', cookie: b.cookie, body: { body: 'oi' } })).s === 404);
  t('id inválido -> 400', (await call('/posts/abc/comments', { cookie: b.cookie })).s === 400);
  const c1 = await call(`/posts/${pid}/comments`, { method: 'POST', cookie: b.cookie, body: { body: 'primeiro!' } });
  const c2 = await call(`/posts/${pid}/comments`, { method: 'POST', cookie: c.cookie, body: { body: 'segundo' } });
  t('comentar funciona (201, total 1 e 2)', c1.s === 201 && c1.j.total === 1 && c2.j.total === 2 && c1.j.comment.mine === true, JSON.stringify([c1.j, c2.j]));
  const long = await call(`/posts/${pid}/comments`, { method: 'POST', cookie: b.cookie, body: { body: 'x'.repeat(900) } });
  t('comentário é cortado em 500', long.j.comment.body.length === 500);
  const list = await call(`/posts/${pid}/comments`, { cookie: a.cookie });
  t('lista em ordem (antigo -> novo), total 3', list.s === 200 && list.j.total === 3 && list.j.comments[0].body === 'primeiro!' && list.j.comments[1].body === 'segundo', JSON.stringify(list.j).slice(0, 200));
  t('dono do post pode apagar qualquer comentário', list.j.comments.every((x) => x.can_delete === true));
  const listC = await call(`/posts/${pid}/comments`, { cookie: c.cookie });
  t('terceiro só pode apagar o próprio', listC.j.comments.map((x) => x.can_delete).join() === 'false,true,false', listC.j.comments.map((x) => x.can_delete).join());
  const after = await call(`/posts/${pid}/comments?after=${list.j.comments[0].id}`, { cookie: a.cookie });
  t('paginação por ?after', after.j.comments.length === 2 && after.j.comments[0].body === 'segundo');
  t('Caio não apaga comentário da Bia (404)', (await call(`/posts/${pid}/comments/${c1.j.comment.id}`, { method: 'DELETE', cookie: c.cookie })).s === 404);
  const dl = await call(`/posts/${pid}/comments/${long.j.comment.id}`, { method: 'DELETE', cookie: a.cookie });
  t('dono do post apaga comentário alheio', dl.s === 200 && dl.j.total === 2, JSON.stringify(dl.j));
  const dl2 = await call(`/posts/${pid}/comments/${c2.j.comment.id}`, { method: 'DELETE', cookie: c.cookie });
  t('autor apaga o próprio', dl2.s === 200 && dl2.j.total === 1);
  // limite de 20/minuto
  let last; for (let i = 0; i < 22; i++) last = await call(`/posts/${pid}/comments`, { method: 'POST', cookie: c.cookie, body: { body: `spam ${i}` } });
  t('limite de comentários por minuto (429)', last.s === 429 && last.j.error === 'rate_limited', String(last.s));
  await pool.query('DELETE FROM comments WHERE user_id = (SELECT id FROM users WHERE username = $1)', [Cu]);

  // ---- republicar ----
  t('não republica o próprio post', (await call(`/posts/${pid}/repost`, { method: 'POST', cookie: a.cookie })).j.error === 'cannot_repost_self');
  t('republicar sem login -> 401', (await call(`/posts/${pid}/repost`, { method: 'POST' })).s === 401);
  const r1 = await call(`/posts/${pid}/repost`, { method: 'POST', cookie: b.cookie });
  const r2 = await call(`/posts/${pid}/repost`, { method: 'POST', cookie: c.cookie });
  t('republicar liga (1 e 2)', r1.j.reposted === true && r1.j.reposts === 1 && r2.j.reposts === 2, JSON.stringify([r1.j, r2.j]));
  const rep = await call(`/users/${Bu}/reposts`, { cookie: a.cookie });
  t('aba Republicados da Bia mostra o post', rep.s === 200 && rep.j.posts.length === 1 && rep.j.posts[0].id === pid && !!rep.j.posts[0].repost_at && rep.j.posts[0].user.username === A && rep.j.next_cursor != null, JSON.stringify(rep.j).slice(0, 250));
  t('contadores no post', rep.j.posts[0].reposts === 2 && rep.j.posts[0].comments === 1 && rep.j.posts[0].reposted === false);
  const asBia = await call(`/users/${Bu}/reposts`, { cookie: b.cookie });
  t('"reposted" é true para quem republicou', asBia.j.posts[0].reposted === true);
  const prof = await call(`/users/${Bu}`, { cookie: a.cookie });
  t('perfil traz contagem de republicados', prof.j.user.reposts === 1);
  const feed = await call('/feed', { cookie: a.cookie });
  const fp = feed.j.posts.find((x) => x.id === pid);
  t('feed traz comments/reposts', fp && fp.comments === 1 && fp.reposts === 2, JSON.stringify(fp));
  // paginação por next_cursor
  const p2 = await call('/posts', { method: 'POST', cookie: a.cookie, body: { body: 'segundo post da ana' } });
  await call(`/posts/${p2.j.post.id}/repost`, { method: 'POST', cookie: b.cookie });
  const pg1 = await call(`/users/${Bu}/reposts`, { cookie: a.cookie });
  t('republicados: mais novo primeiro', pg1.j.posts.length === 2 && pg1.j.posts[0].id === p2.j.post.id);
  const pg2 = await call(`/users/${Bu}/reposts?before=${pg1.j.next_cursor}`, { cookie: a.cookie });
  t('republicados: ?before=next_cursor continua do ponto certo (vazio no fim)', pg2.j.posts.length === 0);
  const off = await call(`/posts/${p2.j.post.id}/repost`, { method: 'POST', cookie: b.cookie });
  t('republicar de novo desliga', off.j.reposted === false && off.j.reposts === 0);
  const hash = await call('/search?q=%23teste', { cookie: b.cookie });
  t('busca por hashtag também traz contadores', hash.j.posts[0].reposts === 2 && hash.j.posts[0].reposted === true);

  // ---- API de bots ----
  const app = await call('/developers/apps', { method: 'POST', cookie: a.cookie, body: { name: 'Bot', redirect_uri: 'http://localhost:9000/cb' } });
  const kk = await call(`/developers/apps/${app.j.app.client_id}/bot-keys`, { method: 'POST', cookie: a.cookie, body: { name: 'k' } });
  const KEY = kk.j.api_key || kk.j.key.api_key; const H = { 'X-API-Key': KEY };
  t('chave de bot criada', !!KEY, JSON.stringify(kk.j));
  t('bot sem chave -> 401', (await call(`/bot/posts/${pid}/comments`)).s === 401);
  await pool.query("UPDATE site_settings SET setting_value='false' WHERE setting_key='access_open'");
  const bc = await call(`/bot/posts/${pid}/comments`, { headers: H });
  t('SITE FECHADO: bot lê comentários do post (novo primeiro)', bc.s === 200 && bc.j.total === 1 && bc.j.comments[0].body === 'primeiro!' && bc.j.comments[0].user.username === Bu && !('email' in bc.j.comments[0].user), JSON.stringify(bc.j).slice(0, 250));
  await pool.query("UPDATE site_settings SET setting_value='true' WHERE setting_key='access_open'");
  await call(`/posts/${pid}/comments`, { method: 'POST', cookie: c.cookie, body: { body: 'terceiro' } });
  const asc = await call(`/bot/posts/${pid}/comments?order=asc&limit=1`, { headers: H });
  t('bot: order=asc + limit com next_after', asc.j.comments[0].body === 'primeiro!' && asc.j.next_after === asc.j.comments[0].id, JSON.stringify(asc.j).slice(0, 200));
  const asc2 = await call(`/bot/posts/${pid}/comments?order=asc&after=${asc.j.next_after}`, { headers: H });
  t('bot: ?after continua', asc2.j.comments.length === 1 && asc2.j.comments[0].body === 'terceiro');
  const desc = await call(`/bot/posts/${pid}/comments?limit=1`, { headers: H });
  t('bot: padrão novo->antigo com next_before', desc.j.comments[0].body === 'terceiro' && desc.j.next_before != null);
  t('bot: post inexistente 404', (await call('/bot/posts/999999/comments', { headers: H })).s === 404);
  const who = await call(`/bot/posts/${pid}/reposts`, { headers: H });
  t('bot: quem republicou o post', who.j.total === 2 && who.j.reposts.map((x) => x.user.username).sort().join() === [Bu, Cu].sort().join(), JSON.stringify(who.j).slice(0, 200));
  const br = await call(`/bot/reposts?username=${Bu}`, { headers: H });
  t('bot: republicados de um usuário (post + dono + quem republicou)', br.j.reposts.length === 1 && br.j.reposts[0].post.id === pid && br.j.reposts[0].post.user.username === A && br.j.reposts[0].reposted_by.username === Bu && br.j.reposts[0].post.reposts === 2, JSON.stringify(br.j).slice(0, 300));
  const brAll = await call('/bot/reposts?limit=1', { headers: H });
  t('bot: republicados recentes do site, com paginação', brAll.j.reposts.length === 1 && brAll.j.next_before != null);
  const bcs = await call(`/bot/comments?username=${Bu}`, { headers: H });
  t('bot: comentários recentes de uma pessoa', bcs.j.comments.length === 1 && bcs.j.comments[0].post.id === pid && bcs.j.comments[0].post.user.username === A);
  const bp = await call('/bot/posts?limit=5', { headers: H });
  const bpp = bp.j.posts.find((x) => x.id === pid);
  t('bot/posts ganhou comments e reposts', bpp && bpp.comments === 2 && bpp.reposts === 2, JSON.stringify(bpp));
  const rec = await call('/posts/recent?limit=5');
  const rp = rec.j.posts.find((x) => x.id === pid);
  t('posts/recent (público) ganhou comments e reposts', rp && rp.comments === 2 && rp.reposts === 2, JSON.stringify(rp));

  // ---- apagar post leva junto comentários e republicações ----
  await call(`/posts/${pid}`, { method: 'DELETE', cookie: a.cookie });
  const left = await pool.query('SELECT (SELECT count(*) FROM comments WHERE post_id=$1) AS c, (SELECT count(*) FROM reposts WHERE post_id=$1) AS r', [pid]);
  t('apagar o post remove comentários e republicações', left.rows[0].c === '0' && left.rows[0].r === '0');
  t('republicados da Bia não mostra post apagado', (await call(`/users/${Bu}/reposts`, { cookie: a.cookie })).j.posts.length === 0);

  console.log(`\n${pass} passaram, ${fail} falharam`);
  process.exit(fail ? 1 : 0);
});
