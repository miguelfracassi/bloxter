(() => {
  const app = document.getElementById('oauth-app');
  const query = new URLSearchParams(location.search);
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const params = {
    client_id: query.get('client_id') || '',
    redirect_uri: query.get('redirect_uri') || '',
    response_type: query.get('response_type') || '',
    scope: query.get('scope') || 'profile',
    state: query.get('state') || '',
    code_challenge: query.get('code_challenge') || '',
    code_challenge_method: query.get('code_challenge_method') || '',
  };
  let client = null;
  let user = null;
  const api = async (path, method = 'GET', body) => {
    const response = await fetch(`/api/${path}`, { method, credentials: 'same-origin', headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) { const error = new Error(data.error || 'request_failed'); error.code = data.error; throw error; }
    return data;
  };
  const brand = `<header class="dev-top"><a class="dev-brand" href="/acess"><img src="/symbol.png" alt=""><span>Bloxter</span></a><span class="dev-top-right">Autorização segura</span></header>`;

  function renderError(message) {
    app.innerHTML = `${brand}<div class="dev-auth-wrap"><section class="dev-auth"><span class="dev-eyebrow">ENTRAR COM BLOXTER</span><h1>Não foi possível continuar</h1><p>${esc(message)}</p><a class="dev-btn" style="display:grid;place-items:center" href="/developers.html">Ir para Bloxter for Developers</a></section></div><footer class="dev-foot"><span>© ${new Date().getFullYear()} Bloxter</span><span>From Ticord</span></footer>`;
  }

  function loginView(error = '') {
    app.innerHTML = `${brand}<div class="dev-auth-wrap"><section class="dev-auth"><span class="dev-eyebrow">ENTRAR COM BLOXTER</span><h1>Entre para continuar</h1><p><strong>${esc(client.name)}</strong> quer conectar à sua conta Bloxter. Entre para revisar os dados solicitados antes de aprovar.</p><form class="dev-form" id="oauth-login"><label>E-mail ou nome de usuário<input name="identifier" autocomplete="username" required></label><label>Senha<input name="password" type="password" autocomplete="current-password" required></label><p class="dev-error" role="alert">${esc(error)}</p><button class="dev-btn" type="submit">Entrar e revisar</button></form><p style="margin-bottom:0">Ainda não tem uma conta? <button class="dev-link" id="oauth-new-account" type="button">Criar conta</button></p></section></div><footer class="dev-foot"><span>© ${new Date().getFullYear()} Bloxter</span><span>From Ticord</span></footer>`;
    app.querySelector('#oauth-login').addEventListener('submit', async (event) => {
      event.preventDefault(); const form = event.currentTarget; const button = form.querySelector('button'); button.disabled = true;
      try { const data = await api('auth/login', 'POST', Object.fromEntries(new FormData(form))); user = data.user; consentView(); }
      catch { form.querySelector('.dev-error').textContent = 'E-mail, usuário ou senha incorretos.'; button.disabled = false; }
    });
    app.querySelector('#oauth-new-account').addEventListener('click', () => signupView());
  }

  function signupView(error = '') {
    app.innerHTML = `${brand}<div class="dev-auth-wrap"><section class="dev-auth"><span class="dev-eyebrow">CRIAR CONTA BLOXTER</span><h1>Crie sua conta</h1><p>Depois do cadastro, você poderá revisar os dados pedidos por <strong>${esc(client.name)}</strong>.</p><form class="dev-form" id="oauth-signup"><label>Nome<input name="name" maxlength="50" autocomplete="name" required></label><label>Nome de usuário<input name="username" minlength="3" maxlength="20" autocomplete="username" autocapitalize="none" required></label><label>E-mail<input name="email" type="email" maxlength="254" autocomplete="email" required></label><label>Senha<input name="password" type="password" minlength="8" maxlength="100" autocomplete="new-password" required></label><label style="display:flex;gap:8px;align-items:flex-start;font-size:12px;line-height:1.5"><input type="checkbox" name="accept_terms" required style="margin-top:3px;width:auto"><span>Li e concordo com os <a href="/terms" target="_blank" rel="noopener">Termos de Serviço</a>, a <a href="/privacy" target="_blank" rel="noopener">Privacidade</a> e as <a href="/rules" target="_blank" rel="noopener">Regras da Comunidade</a>.</span></label><p class="dev-error" role="alert">${esc(error)}</p><button class="dev-btn" type="submit">Criar conta e continuar</button></form><p style="margin-bottom:0">Já tem conta? <button class="dev-link" id="oauth-back-login" type="button">Entrar</button></p></section></div><footer class="dev-foot"><span>© ${new Date().getFullYear()} Bloxter</span><span>From Ticord</span></footer>`;
    app.querySelector('#oauth-signup').addEventListener('submit', async (event) => {
      event.preventDefault(); const form = event.currentTarget; const button = form.querySelector('button'); button.disabled = true;
      try { const data = await api('auth/register', 'POST', { ...Object.fromEntries(new FormData(form)), accept_terms: true }); user = data.user; consentView(); }
      catch (error) {
        const messages = { username_taken: 'Esse nome de usuário já está em uso.', email_taken: 'Esse e-mail já está cadastrado.', invalid_email: 'Informe um e-mail válido.', invalid_username: 'O usuário deve ter de 3 a 20 letras, números ou _.', weak_password: 'A senha precisa ter pelo menos 8 caracteres.' };
        form.querySelector('.dev-error').textContent = messages[error.code] || 'Não foi possível criar a conta.';
        button.disabled = false;
      }
    });
    app.querySelector('#oauth-back-login').addEventListener('click', () => loginView());
  }

  function consentView(error = '') {
    const scopes = [...new Set(params.scope.split(/\s+/).filter(Boolean))];
    app.innerHTML = `${brand}<div class="dev-auth-wrap"><section class="dev-auth"><span class="dev-eyebrow">CONFIRME OS DADOS</span><h1>Entrar com Bloxter</h1><p><strong>${esc(client.name)}</strong> solicita acesso à sua conta.</p><div class="dev-doc-item"><h3>Esta aplicação poderá ver:</h3><ul>${scopes.includes('profile') ? '<li>Seu nome, nome de usuário e foto de perfil.</li>' : ''}${scopes.includes('email') ? '<li>Seu endereço de e-mail.</li>' : ''}</ul></div><p>Você está entrando como <strong>${esc(user.name)}</strong> · @${esc(user.username)}. Só compartilharemos os itens acima.</p><p class="dev-error" role="alert">${esc(error)}</p><div class="dev-modal-actions"><button class="dev-btn secondary" id="oauth-deny" type="button">Não permitir</button><button class="dev-btn" id="oauth-accept" type="button">Permitir e continuar</button></div><p style="margin-bottom:0">Ao continuar, você voltará para o site informado por essa aplicação.</p></section></div><footer class="dev-foot"><span>© ${new Date().getFullYear()} Bloxter</span><span>From Ticord</span></footer>`;
    app.querySelector('#oauth-deny').addEventListener('click', deny);
    app.querySelector('#oauth-accept').addEventListener('click', accept);
  }

  function returnToApp(key, value) {
    const destination = new URL(params.redirect_uri);
    destination.searchParams.set(key, value);
    if (params.state) destination.searchParams.set('state', params.state);
    location.assign(destination.toString());
  }

  function deny() { returnToApp('error', 'access_denied'); }

  async function accept(event) {
    const button = event.currentTarget; button.disabled = true;
    try {
      const result = await api('oauth/authorize', 'POST', params);
      returnToApp('code', result.code);
    } catch {
      consentView('A autorização expirou ou não pôde ser concluída. Volte ao aplicativo e tente novamente.');
    }
  }

  async function start() {
    if (params.response_type !== 'code' || !params.state || params.code_challenge_method !== 'S256' || !/^[A-Za-z0-9_-]{43,128}$/.test(params.code_challenge)) return renderError('O pedido não tem state e PKCE válidos. Inicie o login novamente no site que você estava usando.');
    try {
      const data = await api(`oauth/client?client_id=${encodeURIComponent(params.client_id)}&redirect_uri=${encodeURIComponent(params.redirect_uri)}`);
      client = data;
      const session = await api('me');
      user = session.user;
      if (user) consentView(); else loginView();
    } catch { renderError('O aplicativo ou o endereço de retorno não corresponde a uma configuração registrada no Bloxter.'); }
  }

  start();
})();
