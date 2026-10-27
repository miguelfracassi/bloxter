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
