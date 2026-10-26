# API de bots do Bloxter (chave + missões + seguidores)

## 1. Dono do app (logado no site, cookie de sessão)
- `POST /api/developers/apps` {name, redirect_uri}            -> client_id + client_secret (já existia)
- `POST /api/developers/apps/:client_id/bot-keys` {name}      -> `api_key` (bx_bot_..., aparece 1 vez)
- `GET  /api/developers/apps/:client_id/bot-keys`             -> lista (só prefixo)
- `DELETE /api/developers/apps/:client_id/bot-keys/:prefixo`  -> revoga
- `POST /api/developers/apps/:client_id/missions` {mission_key, title, reward 1..50, repeatable}
- `GET/DELETE /api/developers/apps/:client_id/missions[/:mission_key]`

## 2. Jogador "loga no bot"
Fluxo OAuth que já existe (`/oauth-authorize.html` + `POST /api/oauth/token`, PKCE).
O `access_token` resultante (1 hora) é o `X-User-Token`.

## 3. O bot (headers: `X-API-Key: bx_bot_...`)
- `GET  /api/bot/missions`
- `GET  /api/bot/me`                     (+ `X-User-Token`)  -> usuário e total de seguidores
- `GET  /api/bot/posts?limit=20&before=<id>&username=<opcional>` -> posts recentes; **funciona com o site fechado**
  resposta: {site_open, posts:[{id,body,created_at,likes,user:{id,username,name,avatar,verified,is_ai}}], next_before}
- `POST /api/bot/missions/complete` {mission_key}  (+ `X-User-Token`) -> {ok, reward, followers}

Erros: 401 invalid_api_key / user_login_required / invalid_user_token, 404 mission_not_found,
409 mission_already_completed / reward_cap_reached (teto 500 por pessoa em cada app).

Os seguidores entram em `users.bonus_followers`, o mesmo campo que o admin já usa.
Teste: `node test/run.js` (precisa de Postgres local, ver cabeçalho do arquivo).

## 4. Comentários e republicados (somente leitura, `X-API-Key`; funcionam com o site fechado)
Não precisam de `X-User-Token`. Só devolvem campos públicos (sem e-mail, hash ou token).

- `GET /api/bot/posts/:id/comments?limit=30&before=<id>` -> comentários do post, **mais novos primeiro**
  resposta: {post_id, total, comments:[{id, body, created_at, user:{id,username,name,avatar,verified,is_ai,pageup}}], next_before}
- `GET /api/bot/posts/:id/comments?order=asc&limit=30&after=<id>` -> **mais antigos primeiro** (cursor: `next_after`)
- `GET /api/bot/posts/:id/reposts?limit=30&before=<id>` -> quem republicou o post
  resposta: {post_id, total, reposts:[{id, created_at, user}], next_before}
- `GET /api/bot/reposts?username=<opcional>&limit=30&before=<id>` -> o que foi republicado (a aba "Republicados" do perfil; sem `username` = todo o site)
  resposta: {reposts:[{id, created_at, reposted_by:{...}, post:{id,body,created_at,likes,comments,reposts,user}}], next_before}
- `GET /api/bot/comments?username=<opcional>&limit=30&before=<id>` -> comentários mais recentes do site (ou de uma pessoa)
  resposta: {comments:[{id, body, created_at, user, post:{id, user:{id,username}}}], next_before}
- `GET /api/bot/posts` e `GET /api/posts/recent` (público) agora também trazem `comments` e `reposts` (contagens).

`limit` vai de 1 a 100. Post inexistente: 404 `not_found`; id inválido: 400 `invalid_post`.

## 5. Rotas do site (usuário logado, cookie de sessão)
- `GET  /api/posts/:id/comments?after=<id>` -> {comments, total, more, next_after} (do mais antigo ao mais novo)
- `POST /api/posts/:id/comments` {body (até 500)} -> 201 {comment, total}. Limite: 20 comentários por minuto (429 `rate_limited`)
- `DELETE /api/posts/:id/comments/:commentId` -> quem escreveu ou o dono do post
- `POST /api/posts/:id/repost` -> liga/desliga {reposted, reposts}. Não dá para republicar o próprio post (400 `cannot_repost_self`)
- `GET  /api/users/:username/reposts?before=<next_cursor>` -> {posts (com repost_at), more, next_cursor}
- Posts de `/feed`, `/users/:u/posts`, busca e `POST /posts` trazem `comments`, `reposts` e `reposted`; o perfil traz `reposts`.
