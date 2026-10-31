(() => {
  const app = document.getElementById('ads-app');
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const api = async (path, method = 'GET', body) => {
    const response = await fetch(`/api/${path}`, { method, credentials: 'same-origin', headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) { const error = new Error(data.error || 'request_failed'); error.status = response.status; throw error; }
    return data;
  };
  const toast = (message) => { const el = document.getElementById('toast'); el.textContent = message; el.classList.add('show'); clearTimeout(toast.timer); el.timer = setTimeout(() => el.classList.remove('show'), 2500); };
  let posts = [];
  let filter = '';
  let pendingPost = null;

  function loginView(error = '') {
    app.innerHTML = `<section class="ads-login"><img src="/logo.png" alt="Bloxter"><h1>Gerenciador de anúncios</h1><p>Área exclusiva da administração.</p><form id="ads-login-form"><label for="ads-password">Senha administrativa</label><input id="ads-password" name="password" type="password" inputmode="numeric" autocomplete="current-password" required><p class="ads-error" role="alert">${esc(error)}</p><button class="btn block" type="submit">Entrar</button></form><a class="ads-back" href="/">Voltar ao Bloxter</a></section>`;
    app.querySelector('form').addEventListener('submit', async (event) => {
      event.preventDefault(); const form = event.currentTarget; const button = form.querySelector('button'); button.disabled = true;
      try { await api('admin/login', 'POST', { password: form.password.value }); await loadView(); }
      catch (e) { loginView(e.status === 401 ? 'Senha incorreta.' : 'Não foi possível entrar agora.'); }
      finally { button.disabled = false; }
    });
  }

  function postCard(post) {
    const avatar = post.user.avatar ? `<img src="${esc(post.user.avatar)}" alt="">` : esc((post.user.name || post.user.username || '?').charAt(0));
    return `<article class="ads-post" data-post-id="${post.id}"><div class="ads-post-person"><span class="ads-avatar">${avatar}</span><div><b>${esc(post.user.name)}</b><span>@${esc(post.user.username)} · ${new Date(post.created_at).toLocaleString('pt-BR')}</span></div><span class="ads-state ${post.sponsored ? 'active' : ''}">${post.sponsored ? 'Patrocinado' : 'Orgânico'}</span></div><p class="ads-post-text">${esc(post.body)}</p><button class="btn ${post.sponsored ? 'ghost' : ''} sm" type="button" data-toggle-ad>${post.sponsored ? 'Remover impulsionamento' : 'Impulsionar publicação'}</button></article>`;
  }

  function render() {
    const shown = posts.filter((post) => `${post.body} ${post.user.name} ${post.user.username}`.toLowerCase().includes(filter));
    app.innerHTML = `<header class="ads-top"><a href="/administracao" class="ads-brand"><img src="/logo.png" alt="Bloxter"></a><a href="/administracao" class="btn ghost sm">Administração</a></header><section class="ads-content"><div class="ads-heading"><div><span class="ads-eyebrow">ADMINISTRAÇÃO</span><h1>Gerenciador de anúncios</h1><p>Escolha publicações para aparecerem no topo do feed com o selo Patrocinado.</p></div><div class="ads-count"><b>${posts.filter((p) => p.sponsored).length}</b><span>impulsionadas</span></div></div><div class="ads-toolbar"><label for="ads-search">Publicações recentes</label><input id="ads-search" type="search" placeholder="Buscar por texto, nome ou @usuário" value="${esc(filter)}"></div><div class="ads-list">${shown.length ? shown.map(postCard).join('') : '<div class="ads-empty">Nenhuma publicação encontrada.</div>'}</div></section><div class="ads-confirm-wrap" id="ads-confirm" hidden><section class="ads-confirm" role="dialog" aria-modal="true" aria-labelledby="ads-confirm-title"><h2 id="ads-confirm-title"></h2><p id="ads-confirm-text"></p><div><button class="btn ghost sm" type="button" data-cancel>Cancelar</button><button class="btn sm" type="button" data-confirm>Confirmar</button></div></section></div>`;
    app.querySelector('#ads-search').addEventListener('input', (event) => { filter = event.target.value.trim().toLowerCase(); const cursor = event.target.selectionStart; render(); const next = app.querySelector('#ads-search'); next.focus(); next.setSelectionRange(cursor, cursor); });
    app.querySelectorAll('[data-toggle-ad]').forEach((button) => button.addEventListener('click', () => {
      const card = button.closest('[data-post-id]'); const post = posts.find((p) => Number(p.id) === Number(card.dataset.postId)); if (!post) return;
      pendingPost = post;
      const modal = app.querySelector('#ads-confirm'); modal.hidden = false;
      app.querySelector('#ads-confirm-title').textContent = post.sponsored ? 'Remover impulsionamento?' : 'Impulsionar publicação?';
      app.querySelector('#ads-confirm-text').textContent = post.sponsored ? 'Esta publicação deixará de aparecer como patrocinada no topo do feed.' : 'Esta publicação aparecerá no topo do feed com uma faixa colorida e o selo Patrocinado.';
      app.querySelector('[data-confirm]').textContent = post.sponsored ? 'Remover' : 'Impulsionar';
    }));
    app.querySelector('[data-cancel]').addEventListener('click', () => { pendingPost = null; app.querySelector('#ads-confirm').hidden = true; });
    app.querySelector('#ads-confirm').addEventListener('click', (event) => { if (event.target.id === 'ads-confirm') { pendingPost = null; event.currentTarget.hidden = true; } });
    app.querySelector('[data-confirm]').addEventListener('click', async (event) => {
      if (!pendingPost) return; const button = event.currentTarget; button.disabled = true;
      try { await api(`admin/ads/${pendingPost.id}`, pendingPost.sponsored ? 'DELETE' : 'POST'); toast(pendingPost.sponsored ? 'Impulsionamento removido.' : 'Publicação impulsionada.'); pendingPost = null; await loadView(); }
      catch (e) { button.disabled = false; toast(e.status === 401 ? 'Sua sessão expirou. Entre novamente.' : e.status === 409 ? 'O feed já tem 10 publicações impulsionadas. Remova uma antes de adicionar outra.' : 'Não foi possível atualizar o impulsionamento.'); }
    });
  }

  async function loadView() {
    try { const data = await api('admin/ads'); posts = data.posts || []; render(); }
    catch (e) { if (e.status === 401) loginView(); else app.innerHTML = '<div class="ads-empty">Não foi possível carregar as publicações. Atualize a página para tentar de novo.</div>'; }
  }
  api('admin/me').then(loadView).catch(() => loginView());
})();
