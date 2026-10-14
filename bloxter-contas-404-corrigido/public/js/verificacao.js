(() => {
  'use strict';
  const app = document.getElementById('app');
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtN = (n) => Number(n).toLocaleString('pt-BR');
  const VERIFIED = '<svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true"><path fill="currentColor" d="M22.5 12.5l-2.3-2.6.3-3.5-3.4-.8-1.8-3-3.3 1.4-3.3-1.4-1.8 3-3.4.8.3 3.5L1.5 12.5l2.3 2.6-.3 3.5 3.4.8 1.8 3 3.3-1.4 3.3 1.4 1.8-3 3.4-.8-.3-3.5z"/><path fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" d="M7.8 12.4l3 3 5.6-6"/></svg>';

  let toastTimer;
  function toast(msg) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
  }

  async function api(path, method = 'GET', body) {
    const res = await fetch(`/api/${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'same-origin',
    });
    let data = {};
    try { data = await res.json(); } catch { /* ignore */ }
    if (!res.ok) {
      const e = new Error(data.error || 'server');
      e.status = res.status;
      throw e;
    }
    return data;
  }

  function loginView() {
    app.innerHTML = `
      <form class="login box" id="lf">
        <h1>Administração</h1>
        <div class="sub">Área restrita. Digite a senha.</div>
        <input type="password" name="pw" placeholder="Senha" autocomplete="off" inputmode="numeric" autofocus />
        <div class="err" id="err"></div>
        <button class="btn" type="submit">Entrar</button>
      </form>`;
    document.getElementById('lf').addEventListener('submit', async (e) => {
      e.preventDefault();
      const err = document.getElementById('err');
      err.textContent = '';
      try {
        await api('admin/login', 'POST', { password: e.target.pw.value });
        panelView();
      } catch (x) {
        err.textContent = x.status === 401 ? 'Senha incorreta.' : 'Erro de conexão. Tente de novo.';
        e.target.pw.select();
      }
    });
  }

  function userHTML(u) {
    const created = u.created_at ? new Date(u.created_at).toLocaleDateString('pt-BR') : '—';
    return `<div class="u" data-u="${esc(u.username)}">
      <div class="uh">
        <span class="av">${u.avatar ? `<img src="${esc(u.avatar)}" alt="" />` : esc((u.name || u.username || '?').trim().charAt(0))}</span>
        <div class="info">
          <b>${esc(u.name)}${u.verified ? `<span class="vbadge">${VERIFIED}</span>` : ''}${u.is_ai ? '<span class="aitag">IA</span>' : ''}</b>
          <span class="h">@${esc(u.username)} · <span data-f>${fmtN(u.followers)}</span> seguidores
            <span class="count">(${fmtN(u.real)} reais + ${fmtN(u.bonus)} extras)</span></span>
          <span class="h">${esc(u.email || '')}</span><span class="count">Cadastrado em ${created}</span>
        </div>
        <a class="btn ghost sm" href="/account/${encodeURIComponent(u.username)}" target="_blank" rel="noopener">Ver perfil</a>
      </div>
      <div class="row">
        <label class="chk"><input type="checkbox" data-k="verified" ${u.verified ? 'checked' : ''} /> Verificado</label>
        <label class="chk"><input type="checkbox" data-k="is_ai" ${u.is_ai ? 'checked' : ''} /> Tag de IA</label>
      </div>
      <div class="row">
        <input class="num" type="number" min="0" step="1" placeholder="Quantidade" data-n />
        <button class="btn sm" data-a="add">Adicionar</button>
        <button class="btn sm ghost" data-a="remove">Remover</button>
        <button class="btn sm ghost" data-a="set">Definir extras</button>
      </div>
    </div>`;
  }

  function panelView() {
    app.innerHTML = `
      <div class="top"><div><h1>Administração</h1><div class="sub" style="margin:0">Contas, verificação e abertura do site.</div></div>
        <button class="btn ghost sm" id="out">Sair</button></div>
      <div class="row" role="tablist" aria-label="Seções da administração" style="margin:0 0 14px">
        <button class="btn sm" type="button" role="tab" aria-selected="true" data-panel-tab="registrations">Cadastros</button>
        <button class="btn ghost sm" type="button" role="tab" aria-selected="false" data-panel-tab="access">Acesso ao site</button>
      </div>
      <section id="panel-registrations" role="tabpanel">
      <div class="box">
        <h2 style="font-size:17px;margin:0 0 12px">Contas cadastradas</h2>
        <input type="search" id="q" placeholder="Buscar por @, nome ou e-mail (vazio = mais recentes)" autocomplete="off" />
        <div id="list"></div>
      </div>
      </section>
      <section id="panel-access" role="tabpanel" hidden>
      <div class="box" style="margin-bottom:14px">
        <h2 style="font-size:17px;margin:0 0 4px">Acesso ao site</h2>
        <p class="sub" id="access-state" style="margin:0 0 12px">Carregando estado...</p>
        <div class="row"><button class="btn sm" id="access-toggle" type="button">Carregando...</button>
          <a class="btn ghost sm" href="/home" id="admin-enter">Entrar no site como administrador</a></div>
      </div>
      </section>`;
    document.querySelectorAll('[data-panel-tab]').forEach((tab) => tab.addEventListener('click', () => {
      const selected = tab.dataset.panelTab;
      document.querySelectorAll('[data-panel-tab]').forEach((item) => {
        const on = item === tab;
        item.setAttribute('aria-selected', String(on));
        item.classList.toggle('ghost', !on);
      });
      document.getElementById('panel-registrations').hidden = selected !== 'registrations';
      document.getElementById('panel-access').hidden = selected !== 'access';
    }));
    const list = document.getElementById('list');
    const q = document.getElementById('q');
    const accessState = document.getElementById('access-state');
    const accessToggle = document.getElementById('access-toggle');
    let accessOpen = false;
    const loadAccess = async () => {
      try {
        const data = await api('admin/site-access');
        accessOpen = data.access_open;
        accessState.textContent = accessOpen ? 'Site aberto para todos.' : 'Site fechado; visitantes são enviados para /acess.';
        accessToggle.textContent = accessOpen ? 'Fechar o site' : 'Abrir o site para todos';
      } catch { accessState.textContent = 'Não foi possível carregar o estado do acesso.'; }
    };
    accessToggle.addEventListener('click', async () => {
      accessToggle.disabled = true;
      try {
        const data = await api('admin/site-access', 'PATCH', { access_open: !accessOpen });
        accessOpen = data.access_open;
        accessState.textContent = accessOpen ? 'Site aberto para todos.' : 'Site fechado; visitantes são enviados para /acess.';
        accessToggle.textContent = accessOpen ? 'Fechar o site' : 'Abrir o site para todos';
        toast(accessOpen ? 'Acesso público ativado.' : 'Acesso público desativado.');
      } catch { toast('Não foi possível alterar o acesso.'); }
      finally { accessToggle.disabled = false; }
    });
    loadAccess();
    let seq = 0;
    let t;

    const load = async () => {
      const my = ++seq;
      try {
        const { users } = await api(`admin/users?q=${encodeURIComponent(q.value.trim())}`);
        if (my !== seq) return;
        list.innerHTML = users.length ? users.map(userHTML).join('') : '<div class="empty">Nenhum usuário encontrado.</div>';
      } catch (e) {
        if (e.status === 401) return loginView();
        list.innerHTML = '<div class="empty">Erro ao carregar.</div>';
      }
    };
    q.addEventListener('input', () => { clearTimeout(t); t = setTimeout(load, 300); });
    document.getElementById('out').addEventListener('click', async () => {
      try { await api('admin/logout', 'POST'); } catch { /* ignore */ }
      loginView();
    });

    const patch = async (card, body) => {
      try {
        const { user } = await api(`admin/users/${encodeURIComponent(card.dataset.u)}`, 'PATCH', body);
        card.outerHTML = userHTML(user);
        toast('Salvo!');
      } catch (e) {
        if (e.status === 401) return loginView();
        toast('Não foi possível salvar.');
      }
    };

    list.addEventListener('change', (e) => {
      const k = e.target.dataset && e.target.dataset.k;
      if (!k) return;
      patch(e.target.closest('.u'), { [k]: e.target.checked });
    });
    list.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-a]');
      if (!btn) return;
      const card = btn.closest('.u');
      const raw = card.querySelector('[data-n]').value.trim();
      const n = Math.floor(Number(raw));
      if (raw === '' || !Number.isFinite(n) || n < 0) return toast('Digite uma quantidade válida.');
      const a = btn.dataset.a;
      patch(card, a === 'add' ? { add_followers: n } : a === 'remove' ? { add_followers: -n } : { set_bonus: n });
    });
    load();
  }

  (async () => {
    try { await api('admin/me'); panelView(); } catch { loginView(); }
  })();
})();
