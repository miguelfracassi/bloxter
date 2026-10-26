# Republicados do Bloxter no Discord

Rota usada (somente leitura):

    GET https://bloxter.sbs/api/bot/reposts?username=<opcional>&limit=50&before=<id>
    Header: X-API-Key: bx_bot_...

Resposta (mais novos primeiro):

    { "reposts": [ { "id": 12, "created_at": "...",
        "reposted_by": { "username": "bia", "name": "Bia", "avatar": "/api/avatar/2?v=1", "verified": false },
        "post": { "id": 5, "body": "...", "likes": 3, "comments": 1, "reposts": 2,
                  "user": { "username": "ana", "name": "Ana", "verified": true } } } ],
      "next_before": null }

## Como colocar para rodar
1. No Discord: canal > Editar canal > Integrações > Webhooks > Novo webhook > Copiar URL.
2. No Bloxter: crie a chave do bot (veja BOT_API.md, seção 1).
3. Rode (Node 18+, sem instalar nada):

       BLOXTER_API_KEY=bx_bot_xxx \
       DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/... \
       node discord/republicados.js

Opções: `BLOXTER_USERNAME=ana` (só republicados dessa pessoa), `POLL_SECONDS=30`,
`BACKFILL=5` (envia os 5 últimos na primeira vez), `--once` (uma passada, para cron).
Na primeira execução ele só marca o ponto de partida; depois envia só os novos.
Precisa ficar rodando em algum lugar (seu PC, VPS, Railway, Render...). A Vercel não serve para isso.
