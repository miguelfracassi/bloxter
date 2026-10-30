# Bloxter

A rede social feita para quem vive o roleplay. Preto e branco, fonte Poppins, tema claro/escuro e português/inglês.

## O que tem

- Landing, **login** e **cadastro** (nome, nome de usuário, e-mail e senha)
- Nome de usuário **único** (sem diferenciar maiúsculas) com checagem ao vivo
- Feed estilo Twitter (aba "Para você" e "Seguindo"), posts de até 500 caracteres, curtidas
- Perfil em `/account?u=usuario` (e também `/account/usuario`): foto, nome, @usuário, bio e link na bio
- Seguir / deixar de seguir, busca de pessoas, mensagens diretas
- Idioma PT/EN e tema claro/escuro (salvos no navegador)
- Pré-inauguração em `/acess`, com reserva de usuário e checagem de e-mail/domínio via DNS (sem envio de mensagem)
- Acesso público controlado no banco de dados e ajustável em `/administracao`

## Páginas (cada uma é um arquivo HTML separado)

| URL | Arquivo | Script |
| --- | --- | --- |
| `/` | `public/index.html` | `js/landing.js` |
| `/login` | `public/login.html` | `js/login.js` |
| `/signup` | `public/signup.html` | `js/signup.js` |
| `/acess` | `public/acess.html` | `js/acess.js` |
| `/administracao` | `public/verificacao.html` | `js/verificacao.js` |
| `/home` | `public/home.html` | `js/home.js` |
| `/account?u=usuario` ou `/account/usuario` | `public/profile.html` | `js/profile.js` |
| `/search` | `public/search.html` | `js/search.js` |
| `/messages` | `public/messages.html` | `js/messages.js` |
| `/messages/usuario` | `public/chat.html` | `js/chat.js` |
| `/settings` | `public/settings.html` | `js/settings.js` |
| qualquer outra | `public/404.html` | `js/notfound.js` |

## Como colocar no ar (Vercel + Neon)

1. Suba esta pasta para um repositório no GitHub e importe na Vercel.
2. Na Vercel: **Storage → Create → Neon** e conecte ao projeto (isso cria a variável `DATABASE_URL`).
3. Em **Settings → Environment Variables**, crie `JWT_SECRET` (veja `.env.example`).
4. Faça o deploy. As tabelas são criadas sozinhas na primeira requisição (o `schema.sql` é só referência). O site inicia fechado e a opção de abrir para todos fica em `/administracao`. A área administrativa pode acessar o site fechado usando o botão de entrada como administrador.

Testar local: `npm i -g vercel`, `npm install`, copie `.env.example` para `.env.local` e rode `vercel dev`.

## Estrutura

```
api/[...path].js   API inteira (uma função só)
lib/db.js          Neon + criação das tabelas
lib/auth.js        sessão por cookie (JWT, HttpOnly)
public/*.html      uma página por arquivo
public/js/common.js  código compartilhado (idioma, tema, API, menu, posts)
public/js/<pagina>.js  código de cada página
public/style.css   estilos
vercel.json        URLs limpas (/login em vez de /login.html) e rotas com parâmetro
```

## Banner "Seja verificado"

- Liga/desliga em **/administracao → Acesso ao site → Banner “Seja verificado”** (vem desligado).
- Ligado, quem ainda não é verificado vê o banner na página inicial (logo `public/verificado.png`). Clicar no banner chama `POST /api/me/verified`, que dá o selo, e toca confete + animação (`public/js/verified-offer.js`).
- Desligado, o banner some e o clique é recusado pela API (403 `verified_offer_closed`). Quem já ganhou o selo continua verificado.
- Rotas: `GET/PATCH /api/admin/verified-banner` (admin), `GET /api/me/verified-offer` e `POST /api/me/verified` (usuário logado). Configuração guardada em `site_settings.verified_banner_enabled`.

## Comentários, republicados e story no Instagram

- **Comentar**: ícone de balão em cada post abre uma janela com os comentários (até 500 caracteres; quem comentou ou o dono do post pode apagar).
- **Republicar**: ícone de setas liga/desliga. O post aparece na aba **Republicados** do perfil de quem republicou (não dá para republicar o próprio post). Apagar o post original remove comentários e republicações.
- **Compartilhar no story**: ícone de compartilhar gera no navegador uma imagem 1080x1920 com o post (avatar, nome, selo, texto, data), a logo e **bloxter.sbs**, em tema escuro ou claro. No celular abre o menu de compartilhar do sistema (escolha Instagram > Stories); no computador baixa o PNG.
- **API de bots**: veja `BOT_API.md` (seções 4 e 5).
- Testes: `node test/social.js` (precisa de Postgres local, ver `TEST_DATABASE_URL`).

## Notificações push e "Chave Global"

- O popup de notificações aparece **uma única vez por navegador** (quem responde, mesmo "Não Permito", nunca mais é perguntado).
- Quem aceita é inscrito no push (tabela `push_subscriptions`, com tipo de aparelho: celular ou computador).
- **/administracao → Chave Global**: título, descrição e link (opcional; vazio abre `/home`). "Enviar a todos" pede a senha, envia e mostra os totais de usuários (celular e computador).
- Variáveis (Vercel): `PUSH_SEND_PASSWORD` (padrão `0000`), `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` (opcional: sem elas, as chaves são criadas e guardadas no banco na primeira vez), `VAPID_SUBJECT` (opcional).
- Depende do pacote `web-push` (rode `npm install` / faça novo deploy).

## Notificações programadas (Chave Global)

Em `/administracao` → Chave Global, preencha título, texto e link, escolha **Programar para** (e, se quiser, repetir todo dia/semana) e confirme com a senha. Dá para criar quantas quiser; a lista "Programadas" permite cancelar.

Elas saem sozinhas assim que alguém abre o site depois do horário (checagem a cada ~20 s). Para sair **no minuto exato** mesmo sem ninguém online, crie um cron que chame a cada minuto:

`GET https://SEU-SITE/api/cron/push` com o cabeçalho `Authorization: Bearer <CRON_SECRET>` (ou `?key=<CRON_SECRET>`)

Defina a variável `CRON_SECRET` na Vercel. Pode ser o Vercel Cron (plano Pro, para rodar a cada minuto) ou um serviço gratuito como cron-job.org.

## Trocar o ícone do app

1. Substitua `public/icon.png`, `icon-192.png`, `icon-512.png`, `icon-maskable-512.png` e `apple-touch-icon.png`.
2. Rode `node scripts/bump-icon-version.js` e faça o deploy.

Android/Chrome atualizam o ícone dos apps já instalados sozinhos em poucos dias. No iPhone o ícone da Tela de Início é uma cópia fixa: só muda se a pessoa remover o app e adicionar de novo.


## Contrato de ingressamento da equipe

- Página pública: **`/team/contratoingressamento`** (`public/team/contratoingressamento.html` + `public/js/team-contrato.js`). Funciona com o site fechado e em manutenção.
- A pessoa informa nome (obrigatório), @ no Bloxter/Discord e função (opcionais), lê o termo (sem remuneração, início hoje, sigilo sobre conversas, brigas e retiradas da equipe), assina com o dedo ou o mouse e marca que concorda.
- No navegador é gerada **uma imagem PNG do contrato completo** (texto + nome + data/hora + assinatura) e enviada por `POST /api/team/contract`. A pessoa também pode baixar a própria cópia.
- Em **/administracao → Contratos** a administração vê a lista, abre a imagem, baixa e exclui (`GET /api/admin/contracts`, `GET /api/admin/contracts/:id/image`, `DELETE /api/admin/contracts/:id`).
- Tabela `team_contracts` criada sozinha no primeiro acesso (também em `schema.sql`). Guardamos nome, @, função, imagem, data/hora, user-agent e um **hash** do IP (nunca o IP puro).
- Proteções: só aceita PNG real de até ~2,2 MB, limite de 5 envios por hora por IP.
- Para mudar o texto do termo, edite `TITLE`, `INTRO` e `CLAUSES` no topo de `public/js/team-contrato.js`; a tela e a imagem usam o mesmo texto.

## Top 10 do dia com IA (Groq) + leitura em voz alta

- Em **/administracao → Top 10 IA**, clique em **Analisar posts do dia**. O servidor pega os 30 posts de hoje (fuso de São Paulo; se houver menos de 10, olha as últimas 24 h) com mais curtidas, comentários e republicações e pede para a IA da Groq escolher os 10 melhores, com um motivo curto para cada.
- O resultado fica salvo (`site_settings.ai_top_posts`) e a aba mostra a análise de hoje sem gastar a API de novo. "Analisar de novo" refaz.
- Clique num post (ou em **▶ Ouvir**) para ele ser lido em voz alta; **▶ Ouvir todos** lê em sequência, e dá para escolher a velocidade. A voz é a do navegador (pt-BR), então é de graça e funciona sem a API.
- Se a Groq falhar, a lista sai ordenada só por engajamento e a aba avisa.
- Variável na Vercel: `GROQ_API_KEY` (**Settings → Environment Variables**). Opcional: `GROQ_MODEL`.
- Rotas: `GET/POST /api/admin/top-posts` (só administrador).

## Denúncias (botão ⋯)

- Cada post de outra pessoa tem um botão **⋯**: abre o menu com **Denunciar publicação** e **Denunciar @usuário**. No perfil de outra pessoa há um botão de bandeira que denuncia a conta.
- A janela pergunta em etapas: **categoria** (conteúdo sexual, ofensa/assédio, homofobia, racismo, violência, automutilação, golpe/spam/perfil falso, outro) → **qual opção descreve melhor** → **a quem é dirigido** (só nas categorias de ofensa) → **detalhes opcionais** → confirmação. Conteúdo sexual com menores e automutilação mostram o aviso de ajuda (Disque 100 / CVV 188).
- Para mudar categorias ou textos, edite `REPORT` em `public/js/common.js` e `REPORT_TREE` em `api/index.js` (as chaves precisam ser iguais).
- Rota: `POST /api/reports` `{ type: 'post'|'user', id, category, subcategory, audience, details }`. Limite de 20 por hora por pessoa, não dá para denunciar a si mesmo e denúncia aberta repetida não duplica.
- Admin: `GET /api/admin/reports?status=open|resolved|dismissed|all` e `PATCH /api/admin/reports/:id` `{ status }` (sessão admin ou `X-Admin-Key`). Tabela `reports` criada sozinha no primeiro acesso.

## BannerUP (banner no perfil)

- Ligado por conta em **/administracao → lista de contas → caixa “BannerUP”** (igual ao PageUP). Vem desligado.
- Contas com BannerUP veem **Configurações → Perfil → Banner do perfil**: escolhem uma imagem (recortada em 3:1, 1200×400) e salvam. Também podem remover.
- O banner aparece no topo do perfil (`/account/usuario`). Se a administração desligar o BannerUP, o banner some (a imagem fica guardada e volta se for religado).
- API: `PATCH /api/me` aceita `banner` (data URL; 403 `bannerup_required` sem a função) ou `null` para remover; `GET /api/banner/:id` serve a imagem; `PATCH /api/admin/users/:u` aceita `bannerup: boolean`. Colunas criadas sozinhas: `users.bannerup`, `banner`, `banner_v`.
