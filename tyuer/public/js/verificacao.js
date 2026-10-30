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
          <b>${esc(u.name)}${u.verified ? `<span class="vbadge">${VERIFIED}</span>` : ''}${u.is_ai ? '<span class="aitag">IA</span>' : ''}${u.pageup ? '<span class="aitag" title="PageUP">PageUP</span>' : ''}${u.bannerup ? '<span class="aitag" title="BannerUP">BannerUP</span>' : ''}${u.banned ? '<span class="aitag" style="background:#f4212e;color:#fff">Banida</span>' : ''}</b>
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
        <label class="chk" title="Permite que a conta coloque um banner no perfil (em Configurações)"><input type="checkbox" data-k="bannerup" ${u.bannerup ? 'checked' : ''} /> BannerUP</label>
      </div>
      <div class="row">
        <input class="num" type="number" min="0" step="1" placeholder="Quantidade" data-n />
        <button class="btn sm" data-a="add">Adicionar</button>
        <button class="btn sm ghost" data-a="remove">Remover</button>
        <button class="btn sm ghost" data-a="set">Definir extras</button>
      </div>
      <div class="row">
        ${u.banned
          ? '<button class="btn sm" data-ban="off">Desbanir conta</button>'
          : '<button class="btn sm ghost" data-ban="on">Banir conta</button>'}
        <button class="btn sm ghost" data-del style="color:#f4212e;border-color:#f4212e">Excluir conta</button>
      </div>
      ${u.banned ? `<div class="count">Banida em ${u.banned_at ? new Date(u.banned_at).toLocaleDateString('pt-BR') : '—'}${u.ban_reason ? ` · Motivo: ${esc(u.ban_reason)}` : ''}</div>` : ''}
    </div>`;
  }

  // Janelinha de confirmação (banir / excluir). `match`: texto que precisa ser digitado para liberar o botão.
  function dialog({ title, text, input, match, confirmLabel, danger, onConfirm }) {
    const ov = document.createElement('div');
    ov.className = 'ov';
    ov.innerHTML = `<form class="card" autocomplete="off">
      <h3>${esc(title)}</h3>
      <div class="sub" style="margin:0">${text}</div>
      ${input ? `<input type="text" name="f" placeholder="${esc(input)}" maxlength="300" autocomplete="off" />` : ''}
      <div class="err" data-err></div>
      <div class="row" style="justify-content:flex-end"><button class="btn ghost" type="button" data-cancel>Cancelar</button><button class="btn" type="submit" ${match ? 'disabled' : ''} style="${danger ? 'background:#f4212e;border-color:#f4212e;color:#fff' : ''}">${esc(confirmLabel)}</button></div>
    </form>`;
    app.appendChild(ov);
    const form = ov.querySelector('form');
    const err = ov.querySelector('[data-err]');
    const submit = form.querySelector('button[type=submit]');
    const field = form.elements.f;
    if (field) field.focus();
    const norm = (v) => String(v || '').trim().replace(/^@/, '').toLowerCase();
    if (match && field) field.addEventListener('input', () => { submit.disabled = norm(field.value) !== norm(match); });
    ov.querySelector('[data-cancel]').addEventListener('click', () => ov.remove());
    ov.addEventListener('click', (e) => { if (e.target === ov) ov.remove(); });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      err.textContent = '';
      submit.disabled = true;
      try {
        await onConfirm(field ? field.value.trim() : '');
        ov.remove();
      } catch (x) {
        if (x.status === 401 && x.message !== 'wrong_password') { ov.remove(); return loginView(); }
        err.textContent = 'Não foi possível concluir. Tente de novo.';
        submit.disabled = false;
      }
    });
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

  // ---------- Posts fixados ----------
  function pinsModule() {
    const box = document.getElementById('pins-box');
    let seq = 0;
    let searchTimer;
    const when = (d) => new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    const card = (p) => `<div class="u" data-post="${p.id}">
      <div class="uh">
        <span class="av">${p.user.avatar ? `<img src="${esc(p.user.avatar)}" alt="" />` : esc((p.user.name || p.user.username || '?').trim().charAt(0))}</span>
        <div class="info"><b>${esc(p.user.name)}${p.user.verified ? `<span class="vbadge">${VERIFIED}</span>` : ''}${p.pinned ? '<span class="aitag">Fixado</span>' : ''}</b><span class="h">@${esc(p.user.username)} · ${when(p.created_at)} · #${p.id}</span></div>
        <button class="btn sm ${p.pinned ? 'ghost' : ''}" type="button" data-pin="${p.pinned ? 'off' : 'on'}">${p.pinned ? 'Desafixar' : 'Fixar'}</button>
      </div>
      <div style="overflow-wrap:anywhere;white-space:pre-wrap">${esc(p.body)}</div>
    </div>`;
    function render() {
      box.innerHTML = `
        <h2 style="font-size:17px;margin:0 0 4px">Posts fixados</h2>
        <p class="sub" style="margin:0 0 12px">Posts fixados aparecem no topo do feed de todo mundo, sempre que entram no site. Máximo de 5 ao mesmo tempo.</p>
        <input type="search" id="pq" placeholder="Buscar por texto, @ ou nome (vazio = fixados e mais recentes)" autocomplete="off" />
        <div id="plist"></div>`;
      const list = box.querySelector('#plist');
      const input = box.querySelector('#pq');
      const load = async () => {
        const my = ++seq;
        try {
          const { posts } = await api(`admin/posts?q=${encodeURIComponent(input.value.trim())}`);
          if (my !== seq) return;
          list.innerHTML = posts.length ? posts.map(card).join('') : '<div class="empty">Nenhum post encontrado.</div>';
        } catch (e) {
          if (e.status === 401) return loginView();
          list.innerHTML = '<div class="empty">Erro ao carregar.</div>';
        }
      };
      input.addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(load, 300); });
      list.addEventListener('click', async (e) => {
        const btn = e.target.closest('[data-pin]');
        if (!btn) return;
        const id = btn.closest('[data-post]').dataset.post;
        btn.disabled = true;
        try {
          await api(`admin/pins/${id}`, btn.dataset.pin === 'on' ? 'POST' : 'DELETE');
          toast(btn.dataset.pin === 'on' ? 'Post fixado.' : 'Post desafixado.');
          await load();
        } catch (x) {
          if (x.status === 401) return loginView();
          toast(x.message === 'pin_limit' ? 'Limite de 5 posts fixados. Desafixe um antes.' : 'Não foi possível salvar.');
          btn.disabled = false;
        }
      });
      load();
    }
    return { open: render };
  }

  // ---------- Top 10 do dia (IA da Groq) + leitura em voz alta ----------
  function topModule() {
    const box = document.getElementById('top-box');
    const synth = window.speechSynthesis;
    let posts = [];
    let playing = 0;      // id do post sendo lido (0 = nenhum)
    let queueMode = false; // "Ouvir todos"
    let runId = 0;
    let rate = Number(localStorage.getItem('bx_tts_rate')) || 1;
    const when = (d) => new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

    // Texto falado: tira links e emojis, que os sintetizadores leem muito mal.
    const spokenText = (p) => {
      const body = String(p.body || '')
        .replace(/https?:\/\/\S+/gi, ' link ')
        .replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, '')
        .replace(/\s+/g, ' ').trim();
      return `Número ${p.rank}. Post de ${p.user.name || p.user.username}. ${body}`;
    };
    const pickVoice = () => {
      const v = synth.getVoices();
      return v.find((x) => /^pt-BR/i.test(x.lang) && /google|luciana|francisca|microsoft/i.test(x.name)) || v.find((x) => /^pt-BR/i.test(x.lang)) || v.find((x) => /^pt/i.test(x.lang)) || null;
    };
    function mark() {
      box.querySelectorAll('[data-post]').forEach((el) => {
        const on = Number(el.dataset.post) === playing;
        el.style.background = on ? 'color-mix(in srgb, var(--fg) 8%, transparent)' : '';
        const b = el.querySelector('[data-say]');
        if (b) b.textContent = on ? '■ Parar' : '▶ Ouvir';
      });
      const all = box.querySelector('#top-all');
      if (all) all.textContent = queueMode ? '■ Parar leitura' : '▶ Ouvir todos';
    }
    function stop() {
      runId++;
      queueMode = false;
      playing = 0;
      if (synth) synth.cancel();
      mark();
    }
    function speak(p, onEnd) {
      if (!synth) { toast('Seu navegador não suporta voz.'); return; }
      synth.cancel();
      const my = ++runId;
      const u = new SpeechSynthesisUtterance(spokenText(p));
      const voice = pickVoice();
      u.lang = voice ? voice.lang : 'pt-BR';
      if (voice) u.voice = voice;
      u.rate = rate;
      playing = p.id;
      u.onend = () => { if (my !== runId) return; playing = 0; mark(); if (onEnd) onEnd(); };
      u.onerror = () => { if (my !== runId) return; playing = 0; queueMode = false; mark(); };
      mark();
      synth.speak(u);
    }
    function playAll(i) {
      if (!queueMode || i >= posts.length) { queueMode = false; mark(); return; }
      speak(posts[i], () => playAll(i + 1));
    }

    const card = (p) => `<div class="u" data-post="${p.id}" style="cursor:pointer;border-radius:12px;padding-left:8px;padding-right:8px">
      <div class="uh">
        <b style="font-size:22px;min-width:34px;color:var(--fg2)">${p.rank}º</b>
        <span class="av">${p.user.avatar ? `<img src="${esc(p.user.avatar)}" alt="" />` : esc((p.user.name || p.user.username || '?').trim().charAt(0))}</span>
        <div class="info"><b>${esc(p.user.name)}${p.user.verified ? `<span class="vbadge">${VERIFIED}</span>` : ''}</b><span class="h">@${esc(p.user.username)} · ${when(p.created_at)} · #${p.id}</span></div>
        <button class="btn sm" type="button" data-say>▶ Ouvir</button>
      </div>
      <div style="overflow-wrap:anywhere;white-space:pre-wrap">${esc(p.body)}</div>
      <div class="count">♥ ${fmtN(p.likes)} · 💬 ${fmtN(p.comments)} · ⟲ ${fmtN(p.reposts)}${p.reason ? ` · <i>IA: ${esc(p.reason)}</i>` : ''}</div>
    </div>`;

    function paint(data) {
      const info = box.querySelector('#top-info');
      const list = box.querySelector('#top-list');
      posts = data.posts || [];
      box.querySelector('#top-all').hidden = !posts.length;
      if (!data.generated) {
        info.textContent = 'Ainda não analisado hoje. Clique em “Analisar posts do dia”.';
        list.innerHTML = '';
        return;
      }
      if (!posts.length) {
        info.textContent = 'Ainda não há posts hoje para analisar.';
        list.innerHTML = '<div class="empty">Sem posts hoje.</div>';
        return;
      }
      const src = data.source === 'groq' ? 'escolhidos pela IA (Groq)' : 'ordenados por engajamento (a IA não respondeu)';
      info.textContent = `Top ${posts.length} de ${data.day.split('-').reverse().join('/')}, ${src}. Atualizado às ${new Date(data.generated_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}. Clique num post para ouvir.`;
      list.innerHTML = posts.map(card).join('');
      mark();
    }

    async function load() {
      try { paint(await api('admin/top-posts')); }
      catch (e) {
        if (e.status === 401) return loginView();
        box.querySelector('#top-info').textContent = 'Erro ao carregar.';
      }
    }

    function render() {
      box.innerHTML = `
        <h2 style="font-size:17px;margin:0 0 4px">Top 10 do dia (IA)</h2>
        <p class="sub" style="margin:0 0 12px">A IA da Groq analisa os posts de hoje (engajamento, originalidade e qualidade) e escolhe os 10 melhores. Clique num post para ele ser lido em voz alta.</p>
        <div class="row" style="margin-bottom:10px">
          <button class="btn sm" type="button" id="top-run">Analisar posts do dia</button>
          <button class="btn ghost sm" type="button" id="top-all" hidden>▶ Ouvir todos</button>
          <label class="count" style="display:inline-flex;align-items:center;gap:6px">Velocidade
            <select id="top-rate" style="background:transparent;color:var(--fg);border:1px solid var(--line);border-radius:8px;padding:6px">
              <option value="0.8">Lenta</option><option value="1">Normal</option><option value="1.2">Rápida</option><option value="1.5">Muito rápida</option>
            </select></label>
        </div>
        <p class="count" id="top-info" style="margin:0 0 6px">Carregando...</p>
        <div id="top-list"></div>`;
      const sel = box.querySelector('#top-rate');
      sel.value = ['0.8', '1', '1.2', '1.5'].includes(String(rate)) ? String(rate) : '1';
      sel.addEventListener('change', () => { rate = Number(sel.value); try { localStorage.setItem('bx_tts_rate', String(rate)); } catch { /* ignore */ } });

      const run = box.querySelector('#top-run');
      run.addEventListener('click', async () => {
        stop();
        run.disabled = true;
        run.textContent = 'Analisando...';
        try {
          paint(await api('admin/top-posts', 'POST'));
          toast('Análise concluída.');
        } catch (x) {
          if (x.status === 401) return loginView();
          toast('Não foi possível analisar agora.');
        }
        run.disabled = false;
        run.textContent = 'Analisar de novo';
      });
      box.querySelector('#top-all').addEventListener('click', () => {
        if (queueMode) return stop();
        stop();
        queueMode = true;
        playAll(0);
      });
      box.querySelector('#top-list').addEventListener('click', (e) => {
        const el = e.target.closest('[data-post]');
        if (!el) return;
        const id = Number(el.dataset.post);
        if (playing === id) return stop();
        stop();
        const p = posts.find((x) => x.id === id);
        if (p) speak(p);
      });
      if (synth) synth.getVoices(); // algumas vozes carregam só depois da primeira chamada
      load();
    }
    return { open: render, stop };
  }

  // ---------- Contratos de ingressamento da equipe (/team/contratoingressamento) ----------
  function contractsModule() {
    const box = document.getElementById('contracts-box');
    const when = (d) => new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const slug = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'membro';
    let items = [];

    function view(c) {
      const ov = document.createElement('div');
      ov.className = 'ov';
      ov.style.overflowY = 'auto';
      ov.innerHTML = `<div class="card" style="width:min(100%,720px);max-height:92vh;overflow-y:auto">
        <h3>${esc(c.name)}</h3>
        <div class="count">Assinado em ${when(c.signed_at)}</div>
        <img src="/api/admin/contracts/${c.id}/image" alt="Contrato assinado de ${esc(c.name)}" style="width:100%;border:1px solid var(--line);border-radius:10px;background:#fff" />
        <div class="row" style="justify-content:flex-end">
          <a class="btn sm" href="/api/admin/contracts/${c.id}/image" download="contrato-${esc(slug(c.name))}-${c.id}.png">Baixar imagem</a>
          <button class="btn ghost sm" type="button" data-close>Fechar</button>
        </div>
      </div>`;
      app.appendChild(ov);
      ov.querySelector('[data-close]').addEventListener('click', () => ov.remove());
      ov.addEventListener('click', (e) => { if (e.target === ov) ov.remove(); });
    }

    const row = (c) => `<div class="u" data-c="${c.id}">
      <div class="uh">
        <span class="av" aria-hidden="true">${esc((c.name || '?').trim().charAt(0).toUpperCase())}</span>
        <div class="info">
          <b>${esc(c.name)}</b>
          <span class="h">${[c.contact, c.role].filter(Boolean).map(esc).join(' · ') || 'Sem @ nem função informados'}</span>
          <span class="count">Assinado em ${when(c.signed_at)} · #${c.id}</span>
        </div>
      </div>
      <div class="row">
        <button class="btn sm" type="button" data-view>Ver contrato</button>
        <button class="btn sm ghost" type="button" data-del style="color:#f4212e;border-color:#f4212e">Excluir</button>
      </div>
    </div>`;

    async function load() {
      const list = box.querySelector('#clist');
      try {
        const data = await api('admin/contracts');
        items = data.contracts || [];
        box.querySelector('#ccount').textContent = items.length ? `${fmtN(items.length)} contrato(s) assinado(s)` : '';
        list.innerHTML = items.length ? items.map(row).join('') : '<div class="empty">Nenhum contrato assinado ainda.</div>';
      } catch (e) {
        if (e.status === 401) return loginView();
        list.innerHTML = '<div class="empty">Erro ao carregar.</div>';
      }
    }

    function render() {
      box.innerHTML = `
        <h2 style="font-size:17px;margin:0 0 4px">Contratos da equipe</h2>
        <p class="sub" style="margin:0 0 6px">Cada pessoa que assina em <a href="/team/contratoingressamento" target="_blank" rel="noopener" style="text-decoration:underline">/team/contratoingressamento</a> aparece aqui, com a imagem do contrato assinado.</p>
        <p class="count" id="ccount" style="margin:0 0 6px"></p>
        <div id="clist"><div class="empty">Carregando...</div></div>`;
      box.querySelector('#clist').addEventListener('click', (e) => {
        const holder = e.target.closest('[data-c]');
        if (!holder) return;
        const c = items.find((x) => String(x.id) === holder.dataset.c);
        if (!c) return;
        if (e.target.closest('[data-view]')) return view(c);
        if (e.target.closest('[data-del]')) {
          dialog({
            title: 'Excluir contrato',
            text: `Excluir o contrato de <b>${esc(c.name)}</b>? Isso apaga a imagem e não dá para desfazer.`,
            confirmLabel: 'Excluir',
            danger: true,
            onConfirm: async () => { await api(`admin/contracts/${c.id}`, 'DELETE'); toast('Contrato excluído.'); await load(); },
          });
        }
      });
      load();
    }
    return { open: render };
  }

  // ---------- Popup do site (imagem, texto, link e duração) ----------
  function popupModule() {
    const box = document.getElementById('popup-box');
    const fmt = (d) => new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    // Reduz a imagem no navegador (máx. 640px) para ficar leve.
    const shrink = (file) => new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, 640 / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(img.width * scale));
        c.height = Math.max(1, Math.round(img.height * scale));
        const ctx = c.getContext('2d');
        const keepAlpha = /png|webp|gif/.test(file.type);
        if (!keepAlpha) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); }
        ctx.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL(keepAlpha ? 'image/webp' : 'image/jpeg', 0.85));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image')); };
      img.src = url;
    });
    async function render() {
      box.innerHTML = '<div class="empty">Carregando…</div>';
      let cur = null;
      try { cur = (await api('admin/popup')).popup; }
      catch (e) { if (e.status === 401) return loginView(); box.innerHTML = '<div class="empty">Erro ao carregar.</div>'; return; }
      let imageData; // undefined = manter, '' = remover, 'data:' = nova
      const live = cur && cur.active;
      box.innerHTML = `
        <h2 style="font-size:17px;margin:0 0 4px">Popup do site</h2>
        <p class="sub" style="margin:0 0 12px" id="pp-state">${live ? `No ar até ${fmt(cur.expires_at)}.` : (cur ? `Expirou em ${fmt(cur.expires_at)}. Publique de novo para voltar ao ar.` : 'Nenhum popup no ar.')}</p>
        <form id="pp-form" style="display:grid;gap:12px">
          <div>
            <label class="count" for="pp-file">Imagem (opcional)</label>
            <div class="row" style="margin-top:6px"><input type="file" id="pp-file" accept="image/png,image/jpeg,image/webp" /><button class="btn ghost sm" type="button" id="pp-rm" hidden>Remover imagem</button></div>
          </div>
          <div>
            <label class="count" for="pp-text">Texto</label>
            <textarea id="pp-text" maxlength="400" rows="3" style="width:100%;background:transparent;color:var(--fg);border:1px solid var(--line);border-radius:10px;padding:11px 12px;font:inherit;outline:none;resize:vertical">${esc(cur ? cur.text : '')}</textarea>
          </div>
          <div class="row" style="align-items:flex-end">
            <div style="flex:2;min-width:200px"><label class="count" for="pp-link">Link (https://… ou /pagina)</label><input type="text" id="pp-link" placeholder="https://exemplo.com" value="${esc(cur ? cur.link : '')}" /></div>
            <div style="flex:1;min-width:140px"><label class="count" for="pp-label">Texto do link</label><input type="text" id="pp-label" maxlength="40" placeholder="Saiba mais" value="${esc(cur ? cur.link_label : '')}" /></div>
          </div>
          <div class="row" style="align-items:flex-end">
            <div><label class="count" for="pp-dur">Duração</label><input class="num" type="number" id="pp-dur" min="1" step="1" value="1" /></div>
            <select id="pp-unit" style="background:transparent;color:var(--fg);border:1px solid var(--line);border-radius:10px;padding:11px 12px;font:inherit"><option value="days">dias</option><option value="hours">horas</option></select>
          </div>
          <div class="err" id="pp-err"></div>
          <div>
            <div class="count" style="margin-bottom:6px">Prévia</div>
            <div id="pp-preview"></div>
          </div>
          <div class="row"><button class="btn" type="submit">${live ? 'Atualizar e reiniciar duração' : 'Publicar popup'}</button>${cur ? '<button class="btn ghost" type="button" id="pp-del">Remover popup</button>' : ''}</div>
        </form>`;
      const $ = (id) => box.querySelector(id);
      const rm = $('#pp-rm');
      let shownImage = cur && cur.image ? cur.image : '';
      const preview = () => {
        const text = $('#pp-text').value.trim();
        const link = $('#pp-link').value.trim();
        const label = $('#pp-label').value.trim() || 'Saiba mais';
        $('#pp-preview').innerHTML = (text || shownImage) ? `<aside class="election-card" style="margin:0">
          ${shownImage ? `<img class="election-urna site-popup-img" src="${esc(shownImage)}" alt="" />` : ''}
          <p class="election-text" style="white-space:pre-line">${esc(text)}${link ? ` <a class="election-link" href="#" onclick="return false">${esc(label)}</a>` : ''}</p>
          <span class="election-close" aria-hidden="true">×</span></aside>` : '<div class="count">Digite um texto ou escolha uma imagem.</div>';
        rm.hidden = !shownImage;
      };
      ['#pp-text', '#pp-link', '#pp-label'].forEach((id) => $(id).addEventListener('input', preview));
      $('#pp-file').addEventListener('change', async (e) => {
        const f = e.target.files[0];
        if (!f) return;
        try { imageData = await shrink(f); shownImage = imageData; $('#pp-err').textContent = ''; }
        catch { $('#pp-err').textContent = 'Não consegui abrir essa imagem. Escolha outra.'; e.target.value = ''; }
        preview();
      });
      rm.addEventListener('click', () => { imageData = ''; shownImage = ''; $('#pp-file').value = ''; preview(); });
      preview();
      $('#pp-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const err = $('#pp-err');
        err.textContent = '';
        const btn = e.submitter || e.target.querySelector('button[type=submit]');
        btn.disabled = true;
        const body = { text: $('#pp-text').value, link: $('#pp-link').value, link_label: $('#pp-label').value, duration_value: Number($('#pp-dur').value), duration_unit: $('#pp-unit').value };
        if (imageData !== undefined) body.image_data = imageData;
        try { await api('admin/popup', 'PUT', body); toast('Popup publicado!'); render(); }
        catch (x) {
          if (x.status === 401) return loginView();
          const map = { invalid_link: 'O link precisa começar com https:// ou /.', invalid_duration: 'Informe uma duração válida (até 365 dias).', invalid_image: 'Imagem inválida ou muito grande.', popup_empty: 'Coloque um texto ou uma imagem.' };
          err.textContent = map[x.message] || 'Não foi possível salvar.';
          btn.disabled = false;
        }
      });
      const del = $('#pp-del');
      if (del) del.addEventListener('click', async () => {
        if (!confirm('Remover o popup do site?')) return;
        try { await api('admin/popup', 'DELETE'); toast('Popup removido.'); render(); }
        catch (x) { if (x.status === 401) return loginView(); toast('Não foi possível remover.'); }
      });
    }
    return { open: render };
  }

  // ---------- Chave Global: enviar notificação para todos ----------
  function globalModule() {
    const box = document.getElementById('global-box');
    const stat = (n, label) => `<div class="stat"><b>${fmtN(n)}</b><span>${label}</span></div>`;
    async function loadStats(target) {
      try {
        const s = await api('admin/push/stats');
        target.innerHTML = stat(s.users, 'usuários com notificação ativa') + stat(s.mobile, 'usuários no celular') + stat(s.desktop, 'usuários no computador');
      } catch (e) {
        if (e.status === 401) return loginView();
        target.innerHTML = '<div class="count">Não foi possível carregar os totais.</div>';
      }
    }
    function render() {
      box.innerHTML = `
        <h2 style="font-size:17px;margin:0 0 4px">Chave Global</h2>
        <p class="sub" style="margin:0 0 4px">Envie uma notificação para todos que permitiram avisos, no celular e no computador.</p>
        <div class="stats" id="g-stats"><div class="count">Carregando totais…</div></div>
        <form id="g-form" style="display:grid;gap:12px">
          <div><label class="count" for="g-title">Título da notificação</label><input type="text" id="g-title" maxlength="80" autocomplete="off" /></div>
          <div><label class="count" for="g-body">Descrição da notificação</label><textarea class="ta" id="g-body" maxlength="240" rows="3"></textarea></div>
          <div><label class="count" for="g-link">Link ao clicar (opcional)</label><input type="text" id="g-link" placeholder="https://… ou /pagina — vazio abre o site normal" autocomplete="off" /></div>
          <div class="row" style="gap:12px;align-items:flex-end;flex-wrap:wrap">
            <div style="flex:1;min-width:200px"><label class="count" for="g-when">Programar para (opcional)</label><input type="datetime-local" id="g-when" /></div>
            <div style="flex:1;min-width:160px"><label class="count" for="g-repeat">Repetir</label><select id="g-repeat" class="ta" style="min-height:0;padding:12px 13px"><option value="none">Não repetir</option><option value="daily">Todo dia, nesse horário</option><option value="weekly">Toda semana, nesse dia e horário</option></select></div>
          </div>
          <div class="err" id="g-err"></div>
          <div class="row"><button class="btn" type="submit" id="g-submit">Enviar a todos</button></div>
        </form>
        <div id="g-result"></div>
        <h2 style="font-size:15px;margin:22px 0 4px">Programadas</h2>
        <p class="sub" style="margin:0 0 8px">Horário de Brasília. Você pode programar quantas quiser, cada uma com título, texto e link próprios.</p>
        <div id="g-list"><div class="count">Carregando…</div></div>`;
      const $ = (id) => box.querySelector(id);
      loadStats($('#g-stats'));
      loadScheduled();
      // O botão muda conforme exista data: "Enviar a todos" (agora) ou "Programar notificação".
      $('#g-when').addEventListener('input', () => { $('#g-submit').textContent = $('#g-when').value ? 'Programar notificação' : 'Enviar a todos'; });
      $('#g-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const err = $('#g-err');
        err.textContent = '';
        const title = $('#g-title').value.trim();
        const body = $('#g-body').value.trim();
        const link = $('#g-link').value.trim();
        if (!title || !body) { err.textContent = 'Preencha o título e a descrição.'; return; }
        if (link && !/^(https?:\/\/\S+|\/\S*)$/i.test(link)) { err.textContent = 'O link precisa começar com https:// ou /.'; return; }
        const whenRaw = $('#g-when').value;
        if (whenRaw) {
          const when = new Date(whenRaw);
          if (Number.isNaN(when.getTime())) { err.textContent = 'Data inválida.'; return; }
          if (when.getTime() < Date.now() - 60000) { err.textContent = 'Escolha um horário no futuro.'; return; }
          askPassword({ title, body, link, send_at: when.toISOString(), repeat: $('#g-repeat').value });
        } else askPassword({ title, body, link });
      });
    }
    const fmtWhen = (iso) => new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const REPEAT = { none: '', daily: ' · todo dia', weekly: ' · toda semana' };
    async function loadScheduled() {
      const list = box.querySelector('#g-list');
      if (!list) return;
      try {
        const { items } = await api('admin/push/scheduled');
        if (!items.length) { list.innerHTML = '<div class="count">Nenhuma notificação programada.</div>'; return; }
        list.innerHTML = items.map((it) => `
          <div class="box" style="margin:0 0 8px;padding:12px 14px;display:flex;gap:12px;align-items:flex-start;justify-content:space-between">
            <div style="min-width:0">
              <b style="display:block;word-break:break-word">${esc(it.title)}</b>
              <span class="sub" style="display:block;margin:2px 0 4px;word-break:break-word">${esc(it.body)}</span>
              <span class="count">${it.status === 'sent' ? `Enviada em ${fmtWhen(it.last_sent_at || it.send_at)}${it.last_result ? ' · ' + esc(it.last_result) : ''}` : `Sai em ${fmtWhen(it.send_at)}${REPEAT[it.repeat] || ''}${it.last_sent_at ? ` · última: ${fmtWhen(it.last_sent_at)}` : ''}`}${it.link ? ' · ' + esc(it.link) : ''}</span>
            </div>
            <button class="btn ghost" type="button" data-cancel-sched="${it.id}">${it.status === 'sent' ? 'Apagar' : 'Cancelar'}</button>
          </div>`).join('');
        list.querySelectorAll('[data-cancel-sched]').forEach((btn) => btn.addEventListener('click', async () => {
          if (!confirm('Remover essa notificação programada?')) return;
          try { await api(`admin/push/scheduled/${btn.dataset.cancelSched}`, 'DELETE'); toast('Removida.'); loadScheduled(); }
          catch (x) { if (x.status === 401) return loginView(); toast('Não foi possível remover.'); }
        }));
      } catch (e) {
        if (e.status === 401) return loginView();
        list.innerHTML = '<div class="count">Não foi possível carregar as programadas.</div>';
      }
    }
    function askPassword(data) {
      const ov = document.createElement('div');
      ov.className = 'ov';
      ov.innerHTML = `<form class="card" autocomplete="off">
        <h3>Confirmar envio</h3>
        <div class="sub" style="margin:0">${data.send_at ? 'Digite a senha para programar a notificação.' : 'Digite a senha para enviar a notificação a todos.'}</div>
        <input type="password" name="pw" placeholder="Senha" inputmode="numeric" autocomplete="off" />
        <div class="err" id="pw-err"></div>
        <div class="row" style="justify-content:flex-end"><button class="btn ghost" type="button" data-cancel>Cancelar</button><button class="btn" type="submit">${data.send_at ? 'Programar' : 'Enviar'}</button></div>
      </form>`;
      document.getElementById('app').appendChild(ov);
      const form = ov.querySelector('form');
      const err = ov.querySelector('#pw-err');
      const submit = form.querySelector('button[type=submit]');
      form.pw.focus();
      ov.querySelector('[data-cancel]').addEventListener('click', () => ov.remove());
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        err.textContent = '';
        submit.disabled = true;
        submit.textContent = data.send_at ? 'Programando…' : 'Enviando…';
        try {
          if (data.send_at) {
            await api('admin/push/schedule', 'POST', { ...data, password: form.pw.value });
            ov.remove();
            toast('Notificação programada!');
            box.querySelector('#g-form').reset();
            box.querySelector('#g-submit').textContent = 'Enviar a todos';
            loadScheduled();
            return;
          }
          const r = await api('admin/push/send', 'POST', { ...data, password: form.pw.value });
          ov.remove();
          result(r);
        } catch (x) {
          if (x.status === 401 && x.message !== 'wrong_password') { ov.remove(); return loginView(); }
          err.textContent = x.message === 'wrong_password' ? 'Senha incorreta.' : x.message === 'push_unavailable' ? 'O envio ainda não está instalado no servidor (falta o pacote web-push).' : x.message === 'date_in_past' ? 'Esse horário já passou.' : x.message === 'date_too_far' ? 'Programe para até 1 ano à frente.' : x.message === 'too_many_scheduled' ? 'Já existem notificações demais programadas. Cancele algumas.' : 'Não foi possível concluir agora.';
          submit.disabled = false;
          submit.textContent = data.send_at ? 'Programar' : 'Enviar';
          form.pw.select();
        }
      });
    }
    function result(r) {
      const out = box.querySelector('#g-result');
      if (!out) return;
      out.innerHTML = `
        <div class="box" style="margin-top:14px">
          <h2 style="font-size:17px;margin:0 0 4px">Notificação enviada</h2>
          <p class="sub" style="margin:0">Recebida por ${fmtN(r.delivered.users)} de ${fmtN(r.targeted.users)} usuários${r.failed ? ` · ${fmtN(r.failed)} aparelho(s) não receberam` : ''}${r.removed ? ` · ${fmtN(r.removed)} inscrição(ões) antigas removidas` : ''}.</p>
          <div class="stats">
            ${stat(r.targeted.users, 'usuários no total')}
            ${stat(r.targeted.mobile, `usuários no celular (${fmtN(r.delivered.mobile)} receberam)`)}
            ${stat(r.targeted.desktop, `usuários no computador (${fmtN(r.delivered.desktop)} receberam)`)}
          </div>
        </div>`;
      toast('Notificação enviada!');
      loadStats(box.querySelector('#g-stats'));
    }
    return { open: render };
  }

  // ---------- Recursos opcionais liberados pela administração ----------
  function featuresModule() {
    const box = document.getElementById('features-box');
    const META = {
      comments: { name: 'Comentários', desc: 'Botão de comentar nos posts, a janela de comentários e as respostas.' },
      likes: { name: 'Curtidas', desc: 'Botão de curtir nos posts e nos comentários, com a contagem.' },
      hashtags: { name: 'Hashtags (#)', desc: 'As #hashtags viram link, a busca por # e a página Top #.' },
      discord: { name: 'Discord', desc: 'Página /discord, link no rodapé e a opção *discord do PageUP.' },
      liquid_glass: { name: 'Tema Liquid Glass', desc: 'Libera a aparência de vidro translúcido em Acessibilidade. Cada pessoa pode voltar ao visual normal a qualquer momento.' },
    };
    const when = (d) => new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const card = (key, f) => `<div class="u" data-feature="${key}">
      <div class="uh">
        <div class="info">
          <b>${esc(META[key].name)}<span class="aitag"${f.enabled ? '' : ' style="opacity:.7"'}>${f.enabled ? 'Liberado' : 'Bloqueado'}</span></b>
          <span class="h">${esc(META[key].desc)}</span>
          <span class="count" style="display:block;margin-top:2px">${f.enabled ? `Aparece para todos${f.released_at ? ` desde ${when(f.released_at)}` : ''}.` : 'Escondido de todos. Só aparece para você na prévia do site (aba “Acesso ao site”).'}</span>
        </div>
        <button class="btn sm ${f.enabled ? 'ghost' : ''}" type="button" data-toggle="${f.enabled ? 'off' : 'on'}">${f.enabled ? 'Bloquear' : 'Liberar'}</button>
      </div>
    </div>`;
    const draw = (features) => {
      box.querySelector('#f-list').innerHTML = Object.keys(META).map((k) => card(k, features[k] || { enabled: false })).join('');
    };
    async function save(key, enabled, btn) {
      if (btn) btn.disabled = true;
      try {
        const { features } = await api(`admin/features/${key}`, 'PATCH', { enabled });
        draw(features);
        toast(key === 'all' ? (enabled ? 'Tudo liberado para todos!' : 'Tudo bloqueado.') : `${META[key].name}: ${enabled ? 'liberado para todos!' : 'bloqueado.'}`);
      } catch (e) {
        if (e.status === 401) return loginView();
        toast('Não foi possível salvar.');
        if (btn) btn.disabled = false;
      }
    }
    async function render() {
      box.innerHTML = `
        <h2 style="font-size:17px;margin:0 0 4px">Recursos</h2>
        <p class="sub" style="margin:0 0 12px">Ao clicar em <b>Liberar</b>, o recurso passa a aparecer para todos os usuários, na hora. Fica salvo no banco de dados. <b>Bloquear</b> esconde de novo.</p>
        <div class="row" style="margin-bottom:6px"><button class="btn sm" type="button" data-all="on">Liberar tudo</button><button class="btn sm ghost" type="button" data-all="off">Bloquear tudo</button></div>
        <div id="f-list"><div class="empty">Carregando…</div></div>`;
      box.querySelector('[data-all]').parentElement.addEventListener('click', (e) => {
        const b = e.target.closest('[data-all]');
        if (b) save('all', b.dataset.all === 'on', b);
      });
      box.querySelector('#f-list').addEventListener('click', (e) => {
        const b = e.target.closest('[data-toggle]');
        if (b) save(b.closest('[data-feature]').dataset.feature, b.dataset.toggle === 'on', b);
      });
      try {
        draw((await api('admin/features')).features);
      } catch (e) {
        if (e.status === 401) return loginView();
        box.querySelector('#f-list').innerHTML = '<div class="empty">Erro ao carregar.</div>';
      }
    }
    return { open: render };
  }

  function discordComponentsModule() {
    const box = document.getElementById('discord-components-box');
    let imageData = '';
    const statusName = { queued: 'Na fila', sending: 'Enviando', sent: 'Enviado', failed: 'Falhou' };
    const stamp = (value) => value ? new Date(value).toLocaleString('pt-BR') : '—';
    const dataUrl = (blob) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Não consegui ler essa imagem.'));
      reader.readAsDataURL(blob);
    });
    async function prepararImagem(file) {
      if (!file || !file.type.startsWith('image/')) throw new Error('Escolha um arquivo de imagem.');
      if (file.size > 12 * 1024 * 1024) throw new Error('A imagem original precisa ter até 12 MB.');
      const bitmap = await createImageBitmap(file);
      const escala = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * escala));
      canvas.height = Math.max(1, Math.round(bitmap.height * escala));
      canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      let blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', .84));
      if (!blob) throw new Error('Não consegui preparar essa imagem.');
      if (blob.size > 2700000) blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', .68));
      if (!blob || blob.size > 2700000) throw new Error('A imagem continua muito grande depois da compressão.');
      return dataUrl(blob);
    }
    function drawQueue(items) {
      const list = box.querySelector('#discord-components-queue');
      if (!list) return;
      list.innerHTML = items.length ? items.map((item) => `<div class="u">
        <div class="uh"><div class="info"><b>Canal ${esc(item.channel_id)} <span class="aitag">${esc(statusName[item.status] || item.status)}</span></b>
        <span class="h">${esc(item.body || (item.image_data ? 'Publicação com imagem' : 'Componente'))}</span>
        ${item.last_error ? `<span class="count" style="display:block;color:#f66">${esc(item.last_error)}</span>` : ''}</div>
        <span class="count">${esc(stamp(item.sent_at || item.created_at))}</span></div></div>`).join('') : '<div class="empty">Ainda não há componentes enviados.</div>';
    }
    async function refreshQueue() {
      try { drawQueue((await api('admin/discord-components')).items || []); }
      catch (e) { if (e.status === 401) return loginView(); toast('Não foi possível carregar a fila do bot.'); }
    }
    async function render() {
      box.innerHTML = `<h2 style="font-size:17px;margin:0 0 4px">Criar componente Discord V2</h2>
        <p class="sub" style="margin:0 0 14px">Monte a mensagem aqui. O bot envia imagem, separador e texto ao canal selecionado.</p>
        <form id="discord-components-form" style="display:grid;gap:12px">
          <label>Canal do Discord (ID)<input type="text" id="dc-channel" inputmode="numeric" placeholder="Ex.: 123456789012345678" required maxlength="25" /></label>
          <label>Imagem (opcional)<input type="file" id="dc-image" accept="image/png,image/jpeg,image/webp,image/gif" /></label>
          <div id="dc-image-preview-wrap" hidden><img id="dc-image-preview" alt="Prévia da imagem" style="max-width:100%;max-height:260px;object-fit:contain;border-radius:12px;border:1px solid var(--line)" /><button type="button" class="btn ghost sm" id="dc-image-remove" style="margin-top:8px">Remover imagem</button></div>
          <label>Texto (opcional)<textarea class="ta" id="dc-body" maxlength="4000" rows="4" placeholder="Escreva o texto que vai aparecer junto da imagem"></textarea></label>
          <label class="chk"><input type="checkbox" id="dc-separator" checked /> Adicionar linha separadora entre a imagem e o texto</label>
          <label>Espaçamento da linha<select class="ta" id="dc-spacing"><option value="small">Normal</option><option value="large">Amplo</option></select></label>
          <p class="count" style="margin:-6px 0 0">No Discord, a linha ocupa a largura do contêiner; “Amplo” aumenta o espaço vertical ao redor dela.</p>
          <div class="row"><button class="btn" type="submit" id="dc-send">Enviar pelo bot</button><span class="live" id="dc-status" role="status"></span></div>
        </form>
        <div class="row" style="justify-content:space-between;margin-top:22px"><h3 style="font-size:15px;margin:0">Envios recentes</h3><button class="btn ghost sm" type="button" id="dc-refresh">Atualizar</button></div>
        <div id="discord-components-queue"><div class="empty">Carregando...</div></div>`;
      const form = box.querySelector('#discord-components-form');
      const fileInput = box.querySelector('#dc-image');
      const previewWrap = box.querySelector('#dc-image-preview-wrap');
      const preview = box.querySelector('#dc-image-preview');
      const status = box.querySelector('#dc-status');
      box.querySelector('#dc-refresh').addEventListener('click', refreshQueue);
      box.querySelector('#dc-separator').addEventListener('change', (e) => { box.querySelector('#dc-spacing').disabled = !e.target.checked; });
      box.querySelector('#dc-image-remove').addEventListener('click', () => {
        imageData = ''; fileInput.value = ''; preview.removeAttribute('src'); previewWrap.hidden = true;
      });
      fileInput.addEventListener('change', async () => {
        const file = fileInput.files && fileInput.files[0];
        if (!file) return;
        status.textContent = 'Preparando imagem…';
        try {
          imageData = await prepararImagem(file);
          preview.src = imageData; previewWrap.hidden = false; status.textContent = 'Imagem pronta.';
        } catch (e) { imageData = ''; fileInput.value = ''; status.textContent = e.message || 'Não consegui preparar a imagem.'; }
      });
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const send = box.querySelector('#dc-send');
        const body = box.querySelector('#dc-body').value.trim();
        if (!imageData && !body) { status.textContent = 'Adicione uma imagem ou escreva um texto.'; return; }
        send.disabled = true; status.textContent = 'Adicionando à fila…';
        try {
          const data = await api('admin/discord-components', 'POST', {
            channel_id: box.querySelector('#dc-channel').value.trim(), body, image: imageData,
            separator: box.querySelector('#dc-separator').checked,
            separator_spacing: box.querySelector('#dc-spacing').value,
          });
          status.textContent = `Componente #${data.item.id} adicionado à fila do bot.`;
          form.reset(); imageData = ''; preview.removeAttribute('src'); previewWrap.hidden = true;
          box.querySelector('#dc-separator').checked = true; box.querySelector('#dc-spacing').disabled = false;
          await refreshQueue();
        } catch (e) {
          if (e.status === 401) return loginView();
          status.textContent = e.message || 'Não consegui colocar o componente na fila.';
        } finally { send.disabled = false; }
      });
      await refreshQueue();
    }
    return { open: render };
  }

  function panelView() {
    app.innerHTML = `
      <div class="top"><div><h1>Administração</h1><div class="sub" style="margin:0">Contas, verificação e abertura do site.</div></div>
        <div class="row"><a class="btn ghost sm" href="/gerenciador/anúncios.html">Gerenciar anúncios</a><button class="btn ghost sm" id="out">Sair</button></div></div>
      <div class="row" role="tablist" aria-label="Seções da administração" style="margin:0 0 14px">
        <button class="btn sm" type="button" role="tab" aria-selected="true" data-panel-tab="registrations">Cadastros</button>
        <button class="btn ghost sm" type="button" role="tab" aria-selected="false" data-panel-tab="chats">Chats</button>
        <button class="btn ghost sm" type="button" role="tab" aria-selected="false" data-panel-tab="contracts">Contratos</button>
        <button class="btn ghost sm" type="button" role="tab" aria-selected="false" data-panel-tab="top">Top 10 IA</button>
        <button class="btn ghost sm" type="button" role="tab" aria-selected="false" data-panel-tab="pins">Posts fixados</button>
        <button class="btn ghost sm" type="button" role="tab" aria-selected="false" data-panel-tab="popup">Popup</button>
        <button class="btn ghost sm" type="button" role="tab" aria-selected="false" data-panel-tab="global">Chave Global</button>
        <button class="btn ghost sm" type="button" role="tab" aria-selected="false" data-panel-tab="features">Recursos</button>
        <button class="btn ghost sm" type="button" role="tab" aria-selected="false" data-panel-tab="discord-components">Componentes V2</button>
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
      <section id="panel-contracts" role="tabpanel" hidden>
        <div class="box" id="contracts-box"></div>
      </section>
      <section id="panel-top" role="tabpanel" hidden>
        <div class="box" id="top-box"></div>
      </section>
      <section id="panel-pins" role="tabpanel" hidden>
        <div class="box" id="pins-box"></div>
      </section>
      <section id="panel-popup" role="tabpanel" hidden>
        <div class="box" id="popup-box"></div>
      </section>
      <section id="panel-global" role="tabpanel" hidden>
        <div class="box" id="global-box"></div>
      </section>
      <section id="panel-features" role="tabpanel" hidden>
        <div class="box" id="features-box"></div>
      </section>
      <section id="panel-discord-components" role="tabpanel" hidden>
        <div class="box" id="discord-components-box"></div>
      </section>
      <section id="panel-access" role="tabpanel" hidden>
      <div class="box" style="margin-bottom:14px">
        <h2 style="font-size:17px;margin:0 0 4px">Acesso ao site</h2>
        <p class="sub" id="access-state" style="margin:0 0 12px">Carregando estado...</p>
        <div class="row"><button class="btn sm" id="access-toggle" type="button">Carregando...</button>
          <a class="btn ghost sm" href="/home" id="admin-enter">Entrar no site como administrador</a></div>
      </div>
      <div class="box" style="margin-bottom:14px">
        <h2 style="font-size:17px;margin:0 0 4px">Convite Liquid Glass</h2>
        <p class="sub" style="margin:0 0 12px">Ao entrar no Bloxter, cada pessoa verá as opções “Ativar” e “Agora não”. Ativar também libera o tema em Acessibilidade → Aparência.</p>
        <label class="chk"><input type="checkbox" id="glass-invite-enabled" disabled /> Mostrar o convite ao entrar no site</label>
        <p class="count" id="glass-invite-state" style="margin:10px 0 0">Carregando estado...</p>
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
        <h2 style="font-size:17px;margin:0 0 4px">Sistema “Seja verificado”</h2>
        <p class="sub" style="margin:0 0 12px">Ativa a trilha de progresso em Notificações: publicar e interagir em dois dias diferentes, instalar o Bloxter como aplicativo e ativar notificações no aparelho. O selo é concedido automaticamente quando todos os requisitos forem concluídos.</p>
        <div class="row" style="display:grid;gap:8px">
          <label class="chk"><input type="checkbox" id="vb-enabled" disabled /> Ativar o banner de verificado</label>
        </div>
        <p class="count" id="vb-state" style="margin:10px 0 0"></p>
      </div>
      <div class="box" style="margin-bottom:14px">
        <h2 style="font-size:17px;margin:0 0 4px">Selo “New” em Notificações</h2>
        <p class="sub" style="margin:0 0 12px">Mostra o selo “New” ao lado de Notificações no menu e, no primeiro acesso de cada pessoa, o tutorial “Poste fotos” → “Veja notificações da sua conta”. Desligue para retirar os dois.</p>
        <div class="row" style="display:grid;gap:8px">
          <label class="chk"><input type="checkbox" id="nn-enabled" disabled /> Mostrar “New” e o tutorial de Notificações</label>
        </div>
        <p class="count" id="nn-state" style="margin:10px 0 0"></p>
      </div>
      </section>`;
    document.querySelectorAll('[data-panel-tab]').forEach((tab) => tab.addEventListener('click', () => {
      const selected = tab.dataset.panelTab;
      document.querySelectorAll('[data-panel-tab]').forEach((item) => {
        const on = item === tab;
        item.setAttribute('aria-selected', String(on));
        item.classList.toggle('ghost', !on);
      });
      document.querySelectorAll('[role="tabpanel"]').forEach((panel) => { panel.hidden = panel.id !== `panel-${selected}`; });
      if (selected === 'chats') chats.open(); else chats.stop();
      if (selected !== 'top') topMod.stop();
      if (selected === 'top') topMod.open();
      if (selected === 'pins') pins.open();
      if (selected === 'contracts') contracts.open();
      if (selected === 'popup') popup.open();
      if (selected === 'global') globalKey.open();
      if (selected === 'features') featuresMod.open();
      if (selected === 'discord-components') discordComponents.open();
    }));
    const chats = chatsModule();
    const pins = pinsModule();
    const topMod = topModule();
    const contracts = contractsModule();
    const popup = popupModule();
    const globalKey = globalModule();
    const featuresMod = featuresModule();
    const discordComponents = discordComponentsModule();
    const list = document.getElementById('list');
    const q = document.getElementById('q');
    const accessState = document.getElementById('access-state');
    const accessToggle = document.getElementById('access-toggle');
    const glassInvite = document.getElementById('glass-invite-enabled');
    const glassInviteState = document.getElementById('glass-invite-state');
    let accessOpen = false;
    let glassInviteEnabled = false;
    const loadAccess = async () => {
      try {
        const data = await api('admin/site-access');
        accessOpen = data.access_open;
        glassInviteEnabled = data.liquid_glass_prompt;
        glassInvite.checked = glassInviteEnabled;
        glassInvite.disabled = false;
        glassInviteState.textContent = glassInviteEnabled ? 'Convite ativo. O tema Liquid Glass está liberado para todos.' : 'Convite desativado.';
        accessState.textContent = accessOpen ? 'Site aberto para todos.' : 'Site fechado; visitantes são enviados para /acess.';
        accessToggle.textContent = accessOpen ? 'Fechar o site' : 'Abrir o site para todos';
      } catch { accessState.textContent = 'Não foi possível carregar o estado do acesso.'; glassInviteState.textContent = 'Não foi possível carregar o convite.'; }
    };
    glassInvite.addEventListener('change', async () => {
      glassInvite.disabled = true;
      try {
        const data = await api('admin/site-access', 'PATCH', { liquid_glass_prompt: glassInvite.checked });
        glassInviteEnabled = data.liquid_glass_prompt;
        glassInvite.checked = glassInviteEnabled;
        glassInviteState.textContent = glassInviteEnabled ? 'Convite ativo. O tema Liquid Glass está liberado para todos.' : 'Convite desativado. Quem já escolheu o tema pode continuar usando ou voltar para Normal.';
        toast(glassInviteEnabled ? 'Convite e tema Liquid Glass ativados.' : 'Convite Liquid Glass desativado.');
      } catch { glassInvite.checked = glassInviteEnabled; toast('Não foi possível salvar o convite.'); }
      finally { glassInvite.disabled = false; }
    });
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
      vbState.textContent = d.enabled ? 'Ligado: o progresso aparece em Notificações. O selo é concedido após dois dias ativos, instalação do app e notificações push.' : 'Desligado: o progresso fica oculto e o selo não é concedido automaticamente.';
    };
    api('admin/verified-banner').then(applyVb).catch(() => { vbState.textContent = 'Não foi possível carregar o estado do banner.'; });
    vbEnabled.addEventListener('change', async () => {
      vbEnabled.disabled = true;
      try {
        applyVb(await api('admin/verified-banner', 'PATCH', { enabled: vbEnabled.checked }));
        toast(vbEnabled.checked ? 'Sistema de verificação ativado.' : 'Sistema de verificação desativado.');
      } catch { vbEnabled.checked = !vbEnabled.checked; toast('Não foi possível salvar.'); }
      finally { vbEnabled.disabled = false; }
    });
    const nnEnabled = document.getElementById('nn-enabled');
    const nnState = document.getElementById('nn-state');
    const applyNn = (d) => {
      nnEnabled.checked = !!d.enabled;
      nnEnabled.disabled = false;
      nnState.textContent = d.enabled ? 'Ligado: o “New” aparece em Notificações e o tutorial aparece uma vez para cada pessoa.' : 'Desligado: o “New” e o tutorial foram retirados.';
    };
    api('admin/new-notif').then(applyNn).catch(() => { nnState.textContent = 'Não foi possível carregar o estado do “New”.'; });
    nnEnabled.addEventListener('change', async () => {
      nnEnabled.disabled = true;
      try {
        applyNn(await api('admin/new-notif', 'PATCH', { enabled: nnEnabled.checked }));
        toast(nnEnabled.checked ? '“New” ativado.' : '“New” retirado.');
      } catch { nnEnabled.checked = !nnEnabled.checked; toast('Não foi possível salvar.'); }
      finally { nnEnabled.disabled = false; }
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
    list.addEventListener('click', async (e) => {
      const banBtn = e.target.closest('[data-ban]');
      const delBtn = e.target.closest('[data-del]');
      if (banBtn || delBtn) {
        const card = (banBtn || delBtn).closest('.u');
        const uname = card.dataset.u;
        if (delBtn) {
          return dialog({
            title: 'Excluir conta',
            text: `Isso apaga <b>@${esc(uname)}</b> de vez: perfil, posts, comentários, curtidas, seguidores e conversas. <b>Não dá para desfazer.</b> Para confirmar, digite o @ da conta.`,
            input: `Digite ${uname}`, match: uname, confirmLabel: 'Excluir para sempre', danger: true,
            onConfirm: async () => {
              await api(`admin/users/${encodeURIComponent(uname)}/delete`, 'POST', { confirm: uname });
              card.remove();
              toast('Conta excluída.');
              if (!list.querySelector('.u')) list.innerHTML = '<div class="empty">Nenhum usuário encontrado.</div>';
            },
          });
        }
        if (banBtn.dataset.ban === 'on') {
          return dialog({
            title: 'Banir conta',
            text: `<b>@${esc(uname)}</b> não vai mais conseguir entrar nem usar o Bloxter. Você pode desbanir depois. Se quiser, escreva o motivo (a pessoa vê).`,
            input: 'Motivo (opcional)', confirmLabel: 'Banir conta', danger: true,
            onConfirm: async (reason) => {
              const { user } = await api(`admin/users/${encodeURIComponent(uname)}/ban`, 'POST', { reason });
              card.outerHTML = userHTML(user);
              toast('Conta banida.');
            },
          });
        }
        banBtn.disabled = true;
        try {
          const { user } = await api(`admin/users/${encodeURIComponent(uname)}/ban`, 'DELETE');
          card.outerHTML = userHTML(user);
          toast('Conta desbanida.');
        } catch (x) {
          if (x.status === 401) return loginView();
          toast('Não foi possível desbanir.');
          banBtn.disabled = false;
        }
        return;
      }
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
