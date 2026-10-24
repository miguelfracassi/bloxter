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
- `POST /api/bot/missions/complete` {mission_key}  (+ `X-User-Token`) -> {ok, reward, followers}

Erros: 401 invalid_api_key / user_login_required / invalid_user_token, 404 mission_not_found,
409 mission_already_completed / reward_cap_reached (teto 500 por pessoa em cada app).

Os seguidores entram em `users.bonus_followers`, o mesmo campo que o admin já usa.
Teste: `node test/run.js` (precisa de Postgres local, ver cabeçalho do arquivo).
