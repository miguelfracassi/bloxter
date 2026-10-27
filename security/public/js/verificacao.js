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
          <b>${esc(u.name)}${u.verified ? `<span class="vbadge">${VERIFIED}</span>` : ''}${u.is_ai ? '<span class="aitag">IA</span>' : ''}${u.pageup ? '<span class="aitag" title="PageUP">PageUP</span>' : ''}</b>
          <span class="h">@${esc(u.username)} · <span data-f>${fmtN(u.followers)}</span> seguidores
            <span class="count">(${fmtN(u.real)} reais + ${fmtN(u.bonus)} extras)</span></span>
          <span class="h">${esc(u.email || '')}</span><span class="count">Cadastrado em ${created}</span>
        </div>
        <a class="btn ghost sm" href="/account?u=${encodeURIComponent(u.username)}" target="_blank" rel="noopener">Ver perfil</a>
      </div>
      <div class="row">
        <label class="chk"><input type="checkbox" data-k="verified" ${u.verified ? 'checked' : ''} /> Verificado</label>
        <label class="chk"><input type="checkbox" data-k="is_ai" ${u.is_ai ? 'checked' : ''} /> Tag de IA</label>
        <label class="chk" title="Permite mencionar páginas do site nas publicações usando *"><input type="checkbox" data-k="pageup" ${u.pageup ? 'checked' : ''} /> PageUP</label>
      </div>
      <div class="row">
        <input class="num" type="number" min="0" step="1" placeholder="Quantidade" data-n />
        <button class="btn sm" data-a="add">Adicionar</button>
        <button class="btn sm ghost" data-a="remove">Remover</button>
        <button class="btn sm ghost" data-a="set">Definir extras</button>
      </div>
    </div>`;
  }

  // ---------- Chats para moderação (somente leitura) ----------
  function chatsModule() {
    const box = document.getElementById('chats-box');
    const hhmm = (d) => new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    const av = (u) => `<span class="av">${u.avatar ? `<img src="${esc(u.avatar)}" alt="" />` : esc((u.name || u.username || '?').trim().charAt(0))}</span>`;
    const tags = (u) => `${u.verified ? `<span class="vbadge">${VERIFIED}</span>` : ''}${u.is_ai ? '<span class="aitag">IA</span>' : ''}`;
    const GROUP = '<span class="av" aria-hidden="true">#</span>';
    let type = 'direct';
    let timer = null;
    let listSeq = 0;
    let searchTimer;

    const stop = () => { clearInterval(timer); timer = null; };

    function listView() {
      stop();
      box.innerHTML = `
        <div class="row" style="justify-content:space-between;margin-bottom:12px">
          <h2 style="font-size:17px;margin:0">Chats</h2>
          <div class="seg" role="group" aria-label="Tipo de chat">
            <button type="button" data-type="direct" aria-pressed="${type === 'direct'}">Diretas</button>
            <button type="button" data-type="groups" aria-pressed="${type === 'groups'}">Grupos</button>
          </div>
        </div>
        <input type="search" id="cq" placeholder="${type === 'groups' ? 'Buscar por nome do grupo, dono ou membro' : 'Buscar por @ ou nome de quem conversou'}" autocomplete="off" />
        <div class="cl" id="clist"><div class="empty">Carregando…</div></div>`;
      const input = box.querySelector('#cq');
      const list = box.querySelector('#clist');
      const load = async () => {
        const my = ++listSeq;
        try {
          const data = await api(`admin/chats?type=${type}&q=${encodeURIComponent(input.value.trim())}`);
          if (my !== listSeq) return;
          if (!data.chats.length) { list.innerHTML = '<div class="empty">Nenhuma conversa encontrada.</div>'; return; }
          list.innerHTML = data.chats.map((c) => type === 'groups'
            ? `<button class="ci" type="button" data-group="${c.id}">${GROUP}<div class="info"><b>${esc(c.name)}</b><span class="pv">${fmtN(c.member_count)} membros · ${fmtN(c.message_count)} msgs · dono @${esc(c.owner.username)}</span><span class="pv">${esc(c.last || 'Sem mensagens')}</span></div><span class="when">${c.last_at ? hhmm(c.last_at) : ''}</span></button>`
            : `<button class="ci" type="button" data-a="${esc(c.a.username)}" data-b="${esc(c.b.username)}"><span class="pair">${av(c.a)}${av(c.b)}</span><div class="info"><b>@${esc(c.a.username)} ↔ @${esc(c.b.username)}</b><span class="pv">${fmtN(c.message_count)} mensagens</span><span class="pv">${esc(c.last)}</span></div><span class="when">${hhmm(c.last_at)}</span></button>`).join('');
        } catch (e) {
          if (e.status === 401) return loginView();
          list.innerHTML = '<div class="empty">Erro ao carregar.</div>';
        }
      };
      box.querySelectorAll('[data-type]').forEach((b) => b.addEventListener('click', () => { type = b.dataset.type; listView(); }));
      input.addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(load, 300); });
      list.addEventListener('click', (e) => {
        const it = e.target.closest('.ci');
        if (!it) return;
        if (it.dataset.group) threadView({ group: it.dataset.group });
        else threadView({ a: it.dataset.a, b: it.dataset.b });
      });
      load();
    }

    async function threadView(ref) {
      stop();
      const isGroup = !!ref.group;
      const path = isGroup ? `admin/chats/group/${encodeURIComponent(ref.group)}` : `admin/chats/direct/${encodeURIComponent(ref.a)}/${encodeURIComponent(ref.b)}`;
      box.innerHTML = '<div class="empty">Carregando…</div>';
      let data;
      try { data = await api(path); }
      catch (e) {
        if (e.status === 401) return loginView();
        box.innerHTML = '<div class="empty">Não foi possível abrir esta conversa.</div><div class="row" style="justify-content:center"><button class="btn ghost sm" id="cb">Voltar</button></div>';
        box.querySelector('#cb').addEventListener('click', listView);
        return;
      }
      const firstUser = isGroup ? null : data.users[0].username;
      const title = isGroup ? esc(data.group.name) : `@${esc(data.users[0].username)} ↔ @${esc(data.users[1].username)}`;
      const sub = isGroup
        ? `Dono: @${esc(data.group.owner.username)} · ${data.members.length} membros: ${data.members.map((m) => '@' + esc(m.username)).join(', ')}`
        : `${esc(data.users[0].name)} e ${esc(data.users[1].name)}`;
      box.innerHTML = `
        <div class="row" style="justify-content:space-between;margin-bottom:4px">
          <button class="btn ghost sm" id="cb" type="button">← Voltar</button>
          <span class="live" id="live">Atualizando ao vivo</span>
        </div>
        <h2 style="font-size:17px;margin:10px 0 2px;overflow-wrap:anywhere">${title}</h2>
        <div class="count">${sub}</div>
        <div class="row" style="margin-top:10px"><button class="btn ghost sm" id="more" type="button" ${data.has_more ? '' : 'hidden'}>Carregar mensagens anteriores</button></div>
        <div class="mt" id="mt"></div>`;
      const mt = box.querySelector('#mt');
      const more = box.querySelector('#more');
      let firstId = 0;
      let lastId = 0;
      const bubble = (m) => {
        const side = isGroup ? '' : (m.user.username === firstUser ? '' : ' s1');
        return `<div class="mg${side}" data-mid="${m.id}"><span class="who"><a href="/account?u=${encodeURIComponent(m.user.username)}" target="_blank" rel="noopener">${esc(m.user.name)}</a> @${esc(m.user.username)}${tags(m.user)}</span><div class="bb">${esc(m.body)}</div><span class="tm">${hhmm(m.created_at)}</span></div>`;
      };
      const track = (msgs) => { msgs.forEach((m) => { const id = Number(m.id); if (!firstId || id < firstId) firstId = id; if (id > lastId) lastId = id; }); };
      mt.innerHTML = data.messages.length ? data.messages.map(bubble).join('') : '<div class="empty">Nenhuma mensagem.</div>';
      track(data.messages);
      mt.scrollTop = mt.scrollHeight;
      box.querySelector('#cb').addEventListener('click', listView);
      more.addEventListener('click', async () => {
        more.disabled = true;
        try {
          const older = await api(`${path}?before=${firstId}`);
          const prevH = mt.scrollHeight;
          mt.insertAdjacentHTML('afterbegin', older.messages.map(bubble).join(''));
          track(older.messages);
          mt.scrollTop = mt.scrollHeight - prevH;
          more.hidden = !older.has_more;
        } catch (e) { if (e.status === 401) return loginView(); toast('Não foi possível carregar.'); }
        finally { more.disabled = false; }
      });
      const live = box.querySelector('#live');
      timer = setInterval(async () => {
        if (!document.body.contains(box)) return stop();
        try {
          const upd = await api(`${path}?after=${lastId}`);
          live.textContent = 'Atualizando ao vivo';
          if (!upd.messages.length) return;
          const atEnd = mt.scrollHeight - mt.scrollTop - mt.clientHeight < 120;
          const empty = mt.querySelector('.empty'); if (empty) empty.remove();
          mt.insertAdjacentHTML('beforeend', upd.messages.filter((m) => !mt.querySelector(`[data-mid="${m.id}"]`)).map(bubble).join(''));
          track(upd.messages);
          if (atEnd) mt.scrollTop = mt.scrollHeight;
        } catch (e) {
          if (e.status === 401) return loginView();
          live.textContent = 'Sem conexão, tentando de novo…';
        }
      }, 5000);
    }

    return { open() { listView(); }, stop };
  }

  function panelView() {
    app.innerHTML = `
      <div class="top"><div><h1>Administração</h1><div class="sub" style="margin:0">Contas, verificação e abertura do site.</div></div>
        <div class="row"><a class="btn ghost sm" href="/gerenciador/anúncios.html">Gerenciar anúncios</a><button class="btn ghost sm" id="out">Sair</button></div></div>
      <div class="row" role="tablist" aria-label="Seções da administração" style="margin:0 0 14px">
        <button class="btn sm" type="button" role="tab" aria-selected="true" data-panel-tab="registrations">Cadastros</button>
        <button class="btn ghost sm" type="button" role="tab" aria-selected="false" data-panel-tab="chats">Chats</button>
        <button class="btn ghost sm" type="button" role="tab" aria-selected="false" data-panel-tab="access">Acesso ao site</button>
      </div>
      <section id="panel-registrations" role="tabpanel">
      <div class="box">
        <h2 style="font-size:17px;margin:0 0 12px">Contas cadastradas</h2>
        <input type="search" id="q" placeholder="Buscar por @, nome ou e-mail (vazio = mais recentes)" autocomplete="off" />
        <div id="list"></div>
      </div>
      </section>
      <section id="panel-chats" role="tabpanel" hidden>
        <div class="box" id="chats-box"></div>
      </section>
      <section id="panel-access" role="tabpanel" hidden>
      <div class="box" style="margin-bottom:14px">
        <h2 style="font-size:17px;margin:0 0 4px">Acesso ao site</h2>
        <p class="sub" id="access-state" style="margin:0 0 12px">Carregando estado...</p>
        <div class="row"><button class="btn sm" id="access-toggle" type="button">Carregando...</button>
          <a class="btn ghost sm" href="/home" id="admin-enter">Entrar no site como administrador</a></div>
      </div>
      <div class="box" style="margin-bottom:14px">
        <h2 style="font-size:17px;margin:0 0 4px">Introdução de novos usuários</h2>
        <p class="sub" style="margin:0 0 12px">Controla o que aparece para quem acabou de entrar, antes de usar o site.</p>
        <div class="row" style="display:grid;gap:8px">
          <label class="chk"><input type="checkbox" id="ob-position" disabled /> Mostrar “Você é o #número a entrar no Bloxter”</label>
          <label class="chk"><input type="checkbox" id="ob-questions" disabled /> Mostrar as perguntas (categoria, Instagram e Roblox)</label>
        </div>
      </div>
      <div class="box" style="margin-bottom:14px">
        <h2 style="font-size:17px;margin:0 0 4px">Banner “Seja verificado”</h2>
        <p class="sub" style="margin:0 0 12px">Aparece na página inicial, como o aviso das eleições, para quem ainda não é verificado. Ao clicar, a pessoa recebe o selo na hora, com confete e animação.</p>
        <div class="row" style="display:grid;gap:8px">
          <label class="chk"><input type="checkbox" id="vb-enabled" disabled /> Ativar o banner de verificado</label>
        </div>
        <p class="count" id="vb-state" style="margin:10px 0 0"></p>
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
      document.getElementById('panel-chats').hidden = selected !== 'chats';
      if (selected === 'chats') chats.open(); else chats.stop();
    }));
    const chats = chatsModule();
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
    const obPosition = document.getElementById('ob-position');
    const obQuestions = document.getElementById('ob-questions');
    const applyOb = (d) => { obPosition.checked = !!d.show_position; obQuestions.checked = !!d.show_questions; obPosition.disabled = obQuestions.disabled = false; };
    api('admin/onboarding').then(applyOb).catch(() => toast('Não foi possível carregar a introdução de novos usuários.'));
    [[obPosition, 'show_position'], [obQuestions, 'show_questions']].forEach(([box, field]) => box.addEventListener('change', async () => {
      box.disabled = true;
      try {
        applyOb(await api('admin/onboarding', 'PATCH', { [field]: box.checked }));
        toast('Introdução atualizada.');
      } catch { box.checked = !box.checked; toast('Não foi possível salvar.'); }
      finally { box.disabled = false; }
    }));
    const vbEnabled = document.getElementById('vb-enabled');
    const vbState = document.getElementById('vb-state');
    const applyVb = (d) => {
      vbEnabled.checked = !!d.enabled;
      vbEnabled.disabled = false;
      vbState.textContent = d.enabled ? 'Ligado: quem ainda não é verificado vê o banner ao entrar na página inicial. Quem clicar vira verificado.' : 'Desligado: o banner não aparece e o clique não verifica ninguém.';
    };
    api('admin/verified-banner').then(applyVb).catch(() => { vbState.textContent = 'Não foi possível carregar o estado do banner.'; });
    vbEnabled.addEventListener('change', async () => {
      vbEnabled.disabled = true;
      try {
        applyVb(await api('admin/verified-banner', 'PATCH', { enabled: vbEnabled.checked }));
        toast(vbEnabled.checked ? 'Banner de verificado ativado.' : 'Banner de verificado desativado.');
      } catch { vbEnabled.checked = !vbEnabled.checked; toast('Não foi possível salvar.'); }
      finally { vbEnabled.disabled = false; }
    });
    document.getElementById('admin-enter').addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        await api('admin/enter-site', 'POST');
        let hasUser = false;
        try { const m = await api('me'); hasUser = !!(m && m.user); } catch { /* segue para o login */ }
        location.assign(hasUser ? '/home' : '/login?next=%2Fhome');
      } catch {
        toast('Não foi possível abrir a prévia do site. Entre novamente na administração.');
      }
    });
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
