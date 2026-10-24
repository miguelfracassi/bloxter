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

## 5. Rankings (placar do seu app)
Cada app pode ter até 20 rankings. `order`: `desc` (maior pontuação primeiro, padrão) ou `asc` (menor primeiro, ex.: tempo).
Pontuação: inteiro de -1.000.000.000.000 a 1.000.000.000.000. Empates dividem a posição (1, 2, 2, 4).

Dono do app (logado no site, cookie de sessão):
- `POST   /api/developers/apps/:client_id/rankings` {ranking_key, title, order?, unit?}  -> cria (ou atualiza título/ordem/unidade)
- `GET    /api/developers/apps/:client_id/rankings`                      -> lista, com nº de participantes
- `GET    /api/developers/apps/:client_id/rankings/:key?limit=50&offset=0` -> placar
- `DELETE /api/developers/apps/:client_id/rankings/:key/scores`          -> zera as pontuações (nova temporada)
- `DELETE /api/developers/apps/:client_id/rankings/:key`                 -> apaga o ranking

O bot (`X-API-Key: bx_bot_...`) faz o mesmo sem precisar de sessão:
- `POST /api/bot/rankings` {ranking_key, title, order?, unit?}           -> cria
- `GET  /api/bot/rankings`                                               -> lista
- `GET  /api/bot/rankings/:key?limit=50&offset=0`                        -> {ranking, total, entries:[{rank, score, updated_at, user:{id,username,name,avatar,verified}}]}
- `POST /api/bot/rankings/:key/scores` {username, score, mode?}          -> grava a pontuação e devolve a posição
   `mode`: `set` (padrão, substitui), `add` (soma), `max` (só se maior), `min` (só se menor).
   Em vez de `username` pode mandar `X-User-Token` (login OAuth da pessoa).
- `GET    /api/bot/rankings/:key/users/:username`                        -> posição e pontuação de uma pessoa (404 not_ranked)
- `DELETE /api/bot/rankings/:key/users/:username`                        -> tira a pessoa do ranking

Erros: 404 ranking_not_found / user_not_found / not_ranked, 400 invalid_ranking / invalid_order / invalid_score / invalid_mode / username_required, 409 ranking_limit.

## 6. Hashtags
- `GET /api/hashtags/trending?limit=6` -> `{"hashtags":[{"tag":"roleplay","count":42}]}` (limit 1..20). **Pública, sem login e funciona com o site fechado.**
  Conta posts com a hashtag nas últimas 72 h; empate: a usada mais recentemente primeiro. `tag` sem `#`, minúscula (a mesma de `/hashtag?t=`).
  `?detail=1` (usado pelo site) devolve também `rank`, `posts`, `users` e aceita `hours` (1..168).
- `GET /api/hashtags/:tag/posts?before=<id>` (pede o site aberto; não pede login) -> {tag, total, users, posts, more} (mesmo formato dos posts do feed)
- Páginas: `/hashtag?t=tag` e `/tag/tag`.
- Regras: `#` + 2 a 30 letras/números/_, sem só números; guardada em minúsculas e sem acento (#AçãO = #acao); até 10 por post.
