(async () => {
  const { $, esc, state, t, errMsg, api, toast, ICON, avatar, hhmm, accountPath, setTitle, go, pollUnread, forms } = window.BX;
  const view = await BX.init({ auth: 'required', shell: 'app', active: 'messages' });
  if (!view) return;

  const GROUP_ICON = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3"/><path d="M3 19v-1a6 6 0 0 1 12 0v1M16 5.5a3 3 0 0 1 0 5.8M18 14a5 5 0 0 1 3 4v1"/></svg>';

  async function groupThread(groupId) {
    view.innerHTML = '<div class="loading">Carregando grupo…</div>';
    let data;
    try { data = await api(`groups/${groupId}/messages`); }
    catch (error) { view.innerHTML = `<div class="page-head"><a class="icon-btn" href="/messages" aria-label="Voltar">${ICON.arrow}</a><h1>Grupo indisponível</h1></div><div class="empty">${esc(errMsg(error))}</div>`; return; }
    const { group, members } = data;
    setTitle(group.name);
    const memberText = members.map((member) => member.name).join(', ');
    view.innerHTML = `<div class="page-head group-thread-head"><a class="icon-btn" href="/messages" aria-label="Voltar às mensagens">${ICON.arrow}</a><span class="group-avatar">${GROUP_ICON}</span><div><h1>${esc(group.name)}</h1><small>${members.length} pessoas · ${esc(memberText)}</small></div></div>
      <details class="group-invite-box"><summary>Convidar pessoas</summary><form id="group-invite-form"><label for="group-invite-users">Nomes de usuário</label><div class="group-invite-input"><input id="group-invite-users" name="usernames" placeholder="@usuario1, @usuario2" required><button class="btn sm" type="submit">Enviar convite</button></div><small>Convites são obrigatórios para quem desativou a adição direta.</small></form></details>
      <div class="thread group-thread"><div class="thread-body" id="group-thread-body"></div><form class="thread-form" data-form="message" data-group="${group.id}"><input name="body" maxlength="1000" autocomplete="off" placeholder="Escreva no grupo…"><button class="btn" type="submit">Enviar</button></form></div>`;
    const body = $('#group-thread-body');
    let lastId = 0;
    const bubble = (message) => `<div class="group-message ${message.mine ? 'mine' : ''}" data-mid="${message.id}">${message.mine ? '' : `<a class="group-message-author" href="${accountPath(message.user.username)}">${esc(message.user.name)}</a>`}<div class="bubble ${message.mine ? 'me' : 'them'}">${esc(message.body)}<small>${hhmm(message.created_at)}</small></div></div>`;
    const add = (messages, shouldScroll = true) => {
      if (!messages.length) return;
      const empty = $('.empty', body);
      if (empty) empty.remove();
      body.insertAdjacentHTML('beforeend', messages.filter((message) => !$(`[data-mid="${message.id}"]`, body)).map(bubble).join(''));
      lastId = Math.max(lastId, ...messages.map((message) => Number(message.id)));
      if (shouldScroll) body.scrollTop = body.scrollHeight;
    };
    if (data.messages.length) add(data.messages);
    else body.innerHTML = '<div class="empty">A conversa começa com você. Mande uma mensagem para o grupo.</div>';
    state.thread = { add, getLast: () => lastId, group: group.id };
    $('#group-invite-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const button = form.querySelector('button[type="submit"]');
      button.disabled = true;
      const usernames = form.usernames.value.split(/[\s,;]+/).map((name) => name.replace(/^@/, '')).filter(Boolean);
      try {
        const result = await api(`groups/${group.id}/invites`, { method: 'POST', body: { usernames } });
        toast(result.invited ? `${result.invited} convite(s) enviado(s).` : `${result.added} pessoa(s) adicionada(s).`);
        form.reset();
        setTimeout(() => location.reload(), 650);
      } catch (error) { toast(errMsg(error)); button.disabled = false; }
    });
    state.timers.push(setInterval(async () => {
      try {
        const update = await api(`groups/${groupId}/messages?after=${lastId}`);
        add(update.messages, body.scrollHeight - body.scrollTop - body.clientHeight < 120);
      } catch { /* polling tolera falhas transitórias */ }
    }, 4000));
  }

  async function directThread(username) {
    view.innerHTML = `<div class="loading">${t('loading')}</div>`;
    let data;
    try { data = await api(`messages/${encodeURIComponent(username)}`); }
    catch (error) { view.innerHTML = `<div class="page-head"><h1>${t('msg.title')}</h1></div><div class="empty"><b>${t('profile.notfound')}</b></div>`; return; }
    const other = data.user;
    setTitle(other.name);
    let lastId = 0;
    const bubble = (message) => `<div class="bubble ${message.mine ? 'me' : 'them'}" data-mid="${message.id}">${esc(message.body)}<small>${hhmm(message.created_at)}</small></div>`;
    view.innerHTML = `<div class="page-head"><a class="icon-btn" href="/messages" aria-label="${esc(t('back'))}">${ICON.arrow}</a><a href="${accountPath(other.username)}" class="direct-thread-person">${avatar(other, 's32')}<h1>${esc(other.name)}${BX.badges(other)}<small>@${esc(other.username)}</small></h1></a></div><div class="thread"><div class="thread-body" id="tbody"></div><form class="thread-form" data-form="message" data-user="${esc(other.username)}"><input name="body" maxlength="1000" autocomplete="off" placeholder="${esc(t('msg.placeholder'))}"><button class="btn" type="submit">${t('msg.send')}</button></form></div>`;
    const body = $('#tbody');
    const add = (messages, shouldScroll = true) => {
      if (!messages.length) return;
      $('.empty', body)?.remove();
      body.insertAdjacentHTML('beforeend', messages.filter((message) => !$(`[data-mid="${message.id}"]`, body)).map(bubble).join(''));
      lastId = Math.max(lastId, ...messages.map((message) => Number(message.id)));
      if (shouldScroll) body.scrollTop = body.scrollHeight;
    };
    if (data.messages.length) add(data.messages); else body.innerHTML = `<div class="empty">${t('msg.start')}</div>`;
    state.thread = { add, getLast: () => lastId, user: other.username };
    pollUnread();
    state.timers.push(setInterval(async () => {
      try {
        const update = await api(`messages/${encodeURIComponent(other.username)}?after=${lastId}`);
        add(update.messages, body.scrollHeight - body.scrollTop - body.clientHeight < 120);
        if (update.messages.length) pollUnread();
      } catch { /* polling tolera falhas transitórias */ }
    }, 4000));
  }

  forms.message = async (form) => {
    const input = form.body;
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    const path = form.dataset.group ? `groups/${form.dataset.group}/messages` : `messages/${encodeURIComponent(form.dataset.user)}`;
    try {
      const { message } = await api(path, { method: 'POST', body: { body: text } });
      state.thread?.add([message]);
    } catch (error) { input.value = text; toast(errMsg(error)); }
  };

  const groupId = new URLSearchParams(location.search).get('group');
  if (groupId && /^\d+$/.test(groupId)) return groupThread(groupId);
  let username = '';
  try {
    username = new URLSearchParams(location.search).get('u') || '';
    if (!username && /^\/messages\//.test(location.pathname)) username = decodeURIComponent(location.pathname.split('/').filter(Boolean)[1] || '');
  } catch { username = ''; }
  if (!username) return go('/messages', true);
  directThread(username);
})();
