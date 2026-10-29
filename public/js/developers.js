(() => {
  const app = document.getElementById('developers-app');
  const toastEl = document.getElementById('dev-toast');
  const $ = (selector, root = app) => root.querySelector(selector);
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const api = async (path, method = 'GET', body) => {
    const response = await fetch(`/api/${path}`, { method, credentials: 'same-origin', headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) { const error = new Error(data.error || 'Falha ao comunicar com o Bloxter.'); error.status = response.status; error.code = data.error || 'request_failed'; throw error; }
    return data;
  };
  const showToast = (message) => { toastEl.textContent = message; toastEl.classList.add('show'); clearTimeout(showToast.timer); showToast.timer = setTimeout(() => toastEl.classList.remove('show'), 2600); };
  const brand = `<header class="dev-top"><a class="dev-brand" href="/acess"><img src="/symbol.png" alt=""><span>Bloxter <span style="color:#aaa;font-weight:500">for Developers</span></span></a><div class="dev-top-right"><a href="/acess">Voltar ao Bloxter</a></div></header>`;
  let currentUser = null;
  let apps = [];

  function authView(mode = 'login', error = '') {
    const signup = mode === 'signup';
    app.innerHTML = `${brand}<div class="dev-auth-wrap"><section class="dev-auth"><span class="dev-eyebrow">SUA CONTA DE DESENVOLVEDOR</span><h1>${signup ? 'Crie sua conta Bloxter' : 'Entre no portal'}</h1><p>Use sua conta Bloxter para registrar aplicativos, gerenciar credenciais e permitir que pessoas entrem no seu site com Bloxter.</p><div class="dev-tabs" role="tablist"><button type="button" data-auth-mode="login" class="${signup ? '' : 'active'}">Entrar</button><button type="button" data-auth-mode="signup" class="${signup ? 'active' : ''}">Criar conta</button></div><form class="dev-form" id="dev-auth-form">${signup ? `<label>Nome<input name="name" maxlength="50" autocomplete="name" required></label><label>Nome de usuário<input name="username" minlength="3" maxlength="20" autocomplete="username" autocapitalize="none" required></label><label>E-mail<input name="email" type="email" maxlength="254" autocomplete="email" required></label>` : '<label>E-mail ou nome de usuário<input name="identifier" autocomplete="username" required></label>'}<label>Senha<input name="password" type="password" minlength="8" maxlength="100" autocomplete="${signup ? 'new-password' : 'current-password'}" required></label>${signup ? '<label style="display:flex;gap:8px;align-items:flex-start;font-size:12px;line-height:1.5"><input type="checkbox" name="accept_terms" required style="margin-top:3px;width:auto"><span>Li e concordo com os <a href="/terms" target="_blank" rel="noopener">Termos de Serviço</a>, a <a href="/privacy" target="_blank" rel="noopener">Privacidade</a> e as <a href="/rules" target="_blank" rel="noopener">Regras da Comunidade</a>.</span></label>' : ''}<p class="dev-error" role="alert">${esc(error)}</p><button class="dev-btn" type="submit">${signup ? 'Criar conta e continuar' : 'Entrar no portal'}</button></form></section></div><footer class="dev-foot"><span>© ${new Date().getFullYear()} Bloxter</span><span>From Ticord</span></footer>`;
    app.querySelectorAll('[data-auth-mode]').forEach((button) => button.addEventListener('click', () => authView(button.dataset.authMode)));
    $('#dev-auth-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const button = form.querySelector('button[type="submit"]');
      const errorNode = form.querySelector('.dev-error');
      button.disabled = true;
      errorNode.textContent = '';
      const body = Object.fromEntries(new FormData(form));
      if (signup) body.accept_terms = true;
      try {
        const response = signup ? await api('auth/register', 'POST', body) : await api('auth/login', 'POST', body);
        currentUser = response.user;
        dashboard();
      } catch (error) {
        const messages = { invalid_credentials: 'E-mail, usuário ou senha incorretos.', username_taken: 'Esse nome de usuário já está em uso.', email_taken: 'Esse e-mail já está cadastrado.', invalid_email: 'Informe um e-mail válido.', invalid_username: 'O usuário deve ter de 3 a 20 letras, números ou _.', weak_password: 'A senha precisa ter pelo menos 8 caracteres.', site_closed: 'O cadastro está temporariamente fechado.' };
        errorNode.textContent = messages[error.code] || 'Não foi possível entrar. Confira os dados e tente novamente.';
        button.disabled = false;
      }
    });
  }

  function dashboard() {
    app.innerHTML = `${brand}<div class="dev-shell"><section class="dev-hero"><div><span class="dev-eyebrow">FERRAMENTAS PARA QUEM CONSTRÓI</span><h1>Crie com<br>Bloxter.</h1><p>Conecte seu site à comunidade. Cadastre um aplicativo e ofereça “Entrar com Bloxter” com um fluxo seguro de autorização, consentimento e PKCE.</p></div><aside class="dev-hero-card"><b>Olá, ${esc(currentUser.name)} 👋</b><p>Conta <strong>@${esc(currentUser.username)}</strong><br>Seu painel usa a mesma conta do Bloxter. Client secrets são exibidos somente ao criar ou trocar uma credencial.</p></aside></section><div class="dev-grid"><section class="dev-card"><h2>Seus aplicativos</h2><p>Cadastre o site e a URL exata que receberá o retorno do login. Até 10 aplicativos por conta.</p><form class="dev-form" id="app-create"><label>Nome do aplicativo<input name="name" maxlength="80" placeholder="Ex.: Meu site de roleplay" required></label><label>URL de retorno (redirect URI)<input name="redirect_uri" maxlength="500" type="url" placeholder="https://meusite.com/auth/bloxter/callback" required></label><p class="dev-hint">Use HTTPS em produção. A URL deve corresponder exatamente ao callback configurado no seu site.</p><button class="dev-btn" type="submit">＋ Criar aplicativo</button></form><div class="dev-apps" id="dev-apps" style="margin-top:16px"><div class="dev-empty">Carregando seus aplicativos…</div></div></section><section class="dev-card"><h2>Como funciona</h2><p>O “Entrar com Bloxter” usa OAuth 2.0 Authorization Code com PKCE. O usuário aprova o compartilhamento antes de seu site receber um código de uso único.</p><div class="dev-doc-item"><h3>Escopos disponíveis</h3><ul><li><strong>profile</strong>: ID, nome, usuário e foto de perfil.</li><li><strong>email</strong>: e-mail da conta, solicitado separadamente na tela de consentimento.</li></ul></div><div class="dev-doc-item" style="margin-top:10px"><h3>Regras de segurança</h3><ul><li>PKCE com SHA-256 é obrigatório.</li><li>Códigos expiram em 10 minutos e só podem ser usados uma vez.</li><li>Tokens Bearer expiram em 1 hora.</li><li>O client secret fica apenas no servidor do seu site.</li></ul></div></section><section class="dev-card dev-doc"><h2>Integração</h2><p>Use seu client ID no fluxo do navegador. Troque o código pelo token a partir do backend, onde o secret pode ficar protegido.</p><div class="dev-doc-grid"><div class="dev-doc-item"><h3>1. Envie para autorizar</h3><p>Gere um <code>state</code> aleatório e um <code>code_verifier</code> aleatório (43–128 caracteres). Calcule <code>code_challenge = BASE64URL(SHA256(code_verifier))</code> e redirecione o navegador:</p><code class="dev-code">https://bloxter.sbs/oauth-authorize.html?response_type=code&amp;client_id=SEU_CLIENT_ID&amp;redirect_uri=URL_DE_RETORNO&amp;scope=profile%20email&amp;state=VALOR_ALEATORIO&amp;code_challenge=DESAFIO_PKCE&amp;code_challenge_method=S256</code></div><div class="dev-doc-item"><h3>2. Troque o código no backend</h3><p>Depois que o callback receber <code>code</code> e validar <code>state</code>, faça a troca no servidor. Mantenha as credenciais em variáveis de ambiente do seu próprio site:</p><code class="dev-code">POST https://bloxter.sbs/api/oauth/token\nContent-Type: application/x-www-form-urlencoded\n\ngrant_type=authorization_code\n&amp;client_id=SEU_CLIENT_ID\n&amp;client_secret=SEU_CLIENT_SECRET\n&amp;code=CODIGO_RECEBIDO\n&amp;redirect_uri=URL_DE_RETORNO\n&amp;code_verifier=VERIFICADOR_GUARDADO</code></div><div class="dev-doc-item"><h3>3. Consulte o perfil autorizado</h3><p>O token dá acesso somente aos dados permitidos nos escopos aceitos. Não exponha o token em URLs ou logs.</p><code class="dev-code">GET https://bloxter.sbs/api/oauth/userinfo\nAuthorization: Bearer ACCESS_TOKEN</code></div><div class="dev-doc-item"><h3>Resposta do perfil</h3><code class="dev-code">{\n  "sub": "ID_DO_USUARIO",\n  "username": "usuario",\n  "name": "Nome",\n  "picture": "https://bloxter.sbs/api/avatar/...",\n  "email": "somente_com_escopo_email"\n}</code></div></div></section></div></div><footer class="dev-foot"><span>© ${new Date().getFullYear()} Bloxter</span><a href="/support">Ajuda</a><span>From Ticord</span><button class="dev-btn secondary small" id="dev-logout" type="button">Sair da conta</button></footer>`;
    $('#dev-logout').addEventListener('click', async () => { await api('auth/logout', 'POST').catch(() => {}); currentUser = null; authView('login'); });
    $('#app-create').addEventListener('submit', createApp);
    $('#dev-apps').addEventListener('click', appAction);
    loadApps();
    adminApiCard();
  }


  // ---------- API de administração (bx_admin_...) ----------
  function adminApiCard() {
    const shell = $('.dev-shell');
    if (!shell || $('#dev-admin-api')) return;
    const base = location.origin;
    const sec = document.createElement('section');
    sec.id = 'dev-admin-api';
    sec.className = 'dev-card dev-doc';
    sec.style.marginTop = '18px';
    sec.innerHTML = `<h2>API de administração</h2>
      <p>Faça tudo pelo código: banir, desbanir, apagar stories, posts, comentários e contas. Gere uma chave com a <b>senha do painel admin</b> e envie no header <code>X-Admin-Key</code>. A chave aparece uma única vez.</p>
      <div class="dev-bot-create"><input class="dev-bot-name" id="adm-name" maxlength="60" placeholder="Nome da chave (ex.: bot de moderação)"><input class="dev-bot-name" id="adm-pass" type="password" autocomplete="off" placeholder="Senha do painel admin"><button class="dev-btn small" type="button" id="adm-create">Gerar chave admin</button></div>
      <div class="dev-doc-grid">
        <div class="dev-doc-item"><h3>Banir / desbanir</h3><code class="dev-code">POST   ${base}/api/admin/users/:username/ban   {"reason":"motivo"}
DELETE ${base}/api/admin/users/:username/ban
POST   ${base}/api/admin/users/:username/delete {"confirm":"username"}</code></div>
        <div class="dev-doc-item"><h3>Stories</h3><code class="dev-code">GET    ${base}/api/admin/stories?username=&limit=30&before=
DELETE ${base}/api/admin/stories/:id
DELETE ${base}/api/admin/users/:username/stories   (apaga todos)</code></div>
        <div class="dev-doc-item"><h3>Posts e comentários</h3><code class="dev-code">GET    ${base}/api/admin/posts?username=&limit=30&before=
DELETE ${base}/api/admin/posts/:id
DELETE ${base}/api/admin/comments/:id</code></div>
        <div class="dev-doc-item"><h3>Usuários</h3><code class="dev-code">GET    ${base}/api/admin/users?q=texto
PATCH  ${base}/api/admin/users/:username  {"verified":true,"add_followers":10}</code></div>
      </div>
      <code class="dev-code">curl -X DELETE ${base}/api/admin/stories/123 \
  -H "X-Admin-Key: bx_admin_..."

curl -X POST ${base}/api/admin/users/fulano/ban \
  -H "X-Admin-Key: bx_admin_..." -H "Content-Type: application/json" \
  -d '{"reason":"spam"}'</code>
      <p class="dev-hint" style="margin-top:10px!important">Guarde a chave em segredo: ela tem poder total de moderação. Para revogar, use o painel admin (sessão) em <code>DELETE /api/admin/api-keys/:prefixo</code>.</p>`;
    shell.appendChild(sec);
    $('#adm-create', sec).addEventListener('click', async (ev) => {
      const btn = ev.currentTarget; btn.disabled = true;
      try {
        const data = await api('admin/api-keys', 'POST', { name: $('#adm-name', sec).value.trim(), password: $('#adm-pass', sec).value });
        $('#adm-pass', sec).value = '';
        showSecret({ name: 'API de administração' }, data.api_key, 'Chave admin criada');
      } catch (error) {
        const m = { wrong_password: 'Senha do painel incorreta.', admin_key_limit: 'Limite de 10 chaves admin atingido.' };
        showToast(m[error.code] || 'Não foi possível gerar a chave.');
      } finally { btn.disabled = false; }
    });
  }

  async function loadApps() {
    try {
      const data = await api('developers/apps');
      apps = data.apps || [];
      const list = $('#dev-apps');
      if (!list) return;
      list.innerHTML = apps.length ? apps.map((item) => `<article class="dev-app-row" data-client="${esc(item.client_id)}"><div><h3>${esc(item.name)}</h3><p>${esc(item.redirect_uri)}</p><span class="dev-client">${esc(item.client_id)}</span></div><div class="dev-app-actions"><button class="dev-btn secondary small" type="button" data-action="bots" aria-expanded="false">Chaves de bot</button><button class="dev-btn secondary small" type="button" data-action="rotate">Trocar secret</button><button class="dev-btn danger small" type="button" data-action="delete">Excluir</button></div><div class="dev-bots" hidden></div></article>`).join('') : '<div class="dev-empty">Você ainda não cadastrou aplicativos.</div>';
    } catch { const list = $('#dev-apps'); if (list) list.innerHTML = '<div class="dev-empty">Não foi possível carregar os aplicativos.</div>'; }
  }

  async function createApp(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    try {
      const data = await api('developers/apps', 'POST', Object.fromEntries(new FormData(form)));
      form.reset();
      showSecret(data.app, data.client_secret, 'Aplicativo criado');
      await loadApps();
    } catch (error) {
      const messages = { invalid_redirect_uri: 'Use uma URL HTTPS válida. HTTP só é aceito em localhost.', app_name_required: 'Informe um nome com pelo menos 2 caracteres.', app_limit: 'Sua conta já chegou ao limite de 10 aplicativos.' };
      showToast(messages[error.code] || 'Não foi possível criar o aplicativo.');
    } finally { button.disabled = false; }
  }

  function appAction(event) {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const row = button.closest('[data-client]');
    const item = apps.find((candidate) => candidate.client_id === row.dataset.client);
    if (!item) return;
    const action = button.dataset.action;
    if (action === 'bots') return toggleBots(item, row, button);
    if (action === 'bot-create') return createBotKey(item, row, button);
    if (action === 'bot-revoke') return revokeBotKey(item, row, button.dataset.prefix);
    const title = action === 'delete' ? 'Excluir aplicativo?' : 'Trocar o client secret?';
    const message = action === 'delete' ? 'Essa ação revoga os códigos e tokens associados a este aplicativo.' : 'O secret atual para de funcionar imediatamente. Você precisará atualizar a variável de ambiente no seu site.';
    confirmDialog(title, message, action === 'delete' ? 'Excluir aplicativo' : 'Gerar novo secret', async () => {
      button.disabled = true;
      try {
        if (action === 'delete') { await api(`developers/apps/${encodeURIComponent(item.client_id)}`, 'DELETE'); showToast('Aplicativo excluído.'); }
        else { const data = await api(`developers/apps/${encodeURIComponent(item.client_id)}/rotate-secret`, 'POST', {}); showSecret(item, data.client_secret, 'Novo client secret'); }
        await loadApps();
      } catch { showToast('Não foi possível concluir a ação.'); }
      finally { button.disabled = false; }
    }, action === 'delete');
  }

  // ---------- Chaves de bot (bx_bot_...) ----------
  const fmtDate = (value) => value ? new Date(value).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

  function toggleBots(item, row, button) {
    const panel = row.querySelector('.dev-bots');
    const open = panel.hidden;
    panel.hidden = !open;
    button.setAttribute('aria-expanded', String(open));
    if (open) loadBotKeys(item, row);
  }

  async function loadBotKeys(item, row) {
    const panel = row.querySelector('.dev-bots');
    panel.innerHTML = '<div class="dev-empty">Carregando chaves…</div>';
    try {
      const data = await api(`developers/apps/${encodeURIComponent(item.client_id)}/bot-keys`);
      const keys = data.keys || [];
      panel.innerHTML = `<h4>Chaves de bot</h4><p class="dev-hint">Use a chave no header <code>X-API-Key</code> para ler a API de bots (<code>/api/bot/reposts</code>, <code>/api/bot/comments</code> ...). Até 5 chaves por aplicativo.</p>
        <div class="dev-bot-create"><input class="dev-bot-name" maxlength="60" placeholder="Nome opcional (ex.: bot do Discord)" aria-label="Nome da chave"><button class="dev-btn small" type="button" data-action="bot-create">Criar chave de bot</button></div>
        <div class="dev-bot-list">${keys.length ? keys.map((key) => `<div class="dev-bot-key"><div><b>${esc(key.name || 'bot')}</b><span class="dev-client">${esc(key.key_prefix)}…</span><p>Criada em ${esc(fmtDate(key.created_at))} · ${key.last_used_at ? `último uso em ${esc(fmtDate(key.last_used_at))}` : 'nunca usada'}</p></div><button class="dev-btn danger small" type="button" data-action="bot-revoke" data-prefix="${esc(key.key_prefix)}">Revogar</button></div>`).join('') : '<div class="dev-empty">Este aplicativo ainda não tem chaves de bot.</div>'}</div>`;
    } catch { panel.innerHTML = '<div class="dev-empty">Não foi possível carregar as chaves.</div>'; }
  }

  async function createBotKey(item, row, button) {
    const input = row.querySelector('.dev-bot-name');
    button.disabled = true;
    try {
      const data = await api(`developers/apps/${encodeURIComponent(item.client_id)}/bot-keys`, 'POST', { name: input ? input.value.trim() : '' });
      showBotKey(item, data.api_key);
      await loadBotKeys(item, row);
    } catch (error) {
      const messages = { bot_key_limit: 'Limite de 5 chaves por aplicativo. Revogue uma para criar outra.', unauthorized: 'Entre novamente para continuar.', not_found: 'Aplicativo não encontrado.' };
      showToast(messages[error.code] || 'Não foi possível criar a chave.');
    } finally { button.disabled = false; }
  }

  function revokeBotKey(item, row, prefix) {
    confirmDialog('Revogar chave de bot?', `A chave ${prefix}… deixa de funcionar imediatamente. Qualquer bot que a use passará a receber invalid_api_key.`, 'Revogar chave', async () => {
      try { await api(`developers/apps/${encodeURIComponent(item.client_id)}/bot-keys/${encodeURIComponent(prefix)}`, 'DELETE'); showToast('Chave revogada.'); }
      catch { showToast('Não foi possível revogar a chave.'); }
      await loadBotKeys(item, row);
    }, true);
  }

  function showBotKey(item, apiKey) {
    const wrap = document.createElement('div');
    wrap.className = 'dev-modal-wrap';
    wrap.innerHTML = `<section class="dev-modal" role="dialog" aria-modal="true" aria-labelledby="botkey-title"><span class="dev-eyebrow">${esc(item.name)}</span><h2 id="botkey-title">Chave de bot criada</h2><p><strong>Copie agora.</strong> Por segurança o Bloxter guarda somente o hash e <strong>não vai mostrar esta chave de novo</strong>. Se perder, revogue e crie outra.</p><code class="dev-secret">${esc(apiKey)}</code><div class="dev-modal-actions"><button class="dev-btn secondary" data-copy type="button">Copiar chave</button><button class="dev-btn" data-close type="button">Já guardei</button></div></section>`;
    document.body.appendChild(wrap);
    wrap.addEventListener('click', (event) => { if (event.target === wrap || event.target.closest('[data-close]')) wrap.remove(); });
    wrap.querySelector('[data-copy]').addEventListener('click', async () => { try { await navigator.clipboard.writeText(apiKey); showToast('Chave copiada.'); } catch { showToast('Selecione e copie a chave manualmente.'); } });
  }

  function confirmDialog(title, message, confirmLabel, action, danger = false) {
    const wrap = document.createElement('div');
    wrap.className = 'dev-modal-wrap';
    wrap.innerHTML = `<section class="dev-modal" role="dialog" aria-modal="true"><h2>${esc(title)}</h2><p>${esc(message)}</p><div class="dev-modal-actions"><button class="dev-btn secondary" data-cancel type="button">Cancelar</button><button class="dev-btn ${danger ? 'danger' : ''}" data-confirm type="button">${esc(confirmLabel)}</button></div></section>`;
    document.body.appendChild(wrap);
    wrap.addEventListener('click', (event) => { if (event.target === wrap || event.target.closest('[data-cancel]')) wrap.remove(); });
    wrap.querySelector('[data-confirm]').addEventListener('click', async () => { wrap.remove(); await action(); });
  }

  function showSecret(item, secret, title) {
    const wrap = document.createElement('div');
    wrap.className = 'dev-modal-wrap';
    wrap.innerHTML = `<section class="dev-modal" role="dialog" aria-modal="true" aria-labelledby="secret-title"><span class="dev-eyebrow">${esc(item.name)}</span><h2 id="secret-title">${esc(title)}</h2><p>Copie agora e guarde em um gerenciador de segredos. O Bloxter salva somente o hash e não poderá mostrar este valor novamente.</p><p><strong>Client ID</strong></p><code class="dev-secret">${esc(item.client_id)}</code><p><strong>Client secret</strong></p><code class="dev-secret">${esc(secret)}</code><div class="dev-modal-actions"><button class="dev-btn secondary" data-copy type="button">Copiar secret</button><button class="dev-btn" data-close type="button">Já guardei</button></div></section>`;
    document.body.appendChild(wrap);
    wrap.addEventListener('click', (event) => { if (event.target === wrap || event.target.closest('[data-close]')) wrap.remove(); });
    wrap.querySelector('[data-copy]').addEventListener('click', async () => { try { await navigator.clipboard.writeText(secret); showToast('Secret copiado.'); } catch { showToast('Selecione e copie o secret manualmente.'); } });
  }

  api('me').then((data) => { currentUser = data.user; if (currentUser) dashboard(); else authView('login'); }).catch(() => authView('login', 'Entre com sua conta Bloxter para continuar.'));
})();
