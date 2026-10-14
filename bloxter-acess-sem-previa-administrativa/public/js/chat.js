(async () => {
  const { $, root, esc, debounce, store, state, t, errMsg, api, toast, ICON, avatar, ago, hhmm, fmt, accountPath, toggles, langToggle, setTitle, go, safeNext, appShell, publicShell, refreshShellText, setActiveNav, updateBadge, pollUnread, userRow, usernameChecker, postHTML, loadMoreBtn, feed, loadPosts, setFeed, forms, actions, applyLang, applyTheme } = window.BX;
  const v = await BX.init({ auth: 'required', shell: 'app', active: 'messages' });
  if (!v) return;
  async function threadView(v, uname) {
    v.innerHTML = `<div class="loading">${t('loading')}</div>`;
    let data;
    try { data = await api(`messages/${encodeURIComponent(uname)}`); }
    catch (e) {
      v.innerHTML = `<div class="page-head"><h1>${t('msg.title')}</h1></div><div class="empty"><b>${t('profile.notfound')}</b></div>`;
      return;
    }
    const other = data.user;
    setTitle(other.name);
    let lastId = 0;
    const bubble = (m) => `<div class="bubble ${m.mine ? 'me' : 'them'}" data-mid="${m.id}">${esc(m.body)}<small>${hhmm(m.created_at)}</small></div>`;
    v.innerHTML = `
      <div class="page-head">
        <a class="icon-btn" href="/messages" aria-label="${esc(t('back'))}">${ICON.arrow}</a>
        <a href="${accountPath(other.username)}" style="display:flex;align-items:center;gap:10px">${avatar(other, 's32')}
          <h1>${esc(other.name)}${BX.badges(other)}<small>@${esc(other.username)}</small></h1></a>
      </div>
      <div class="thread">
        <div class="thread-body" id="tbody"></div>
        <form class="thread-form" data-form="message" data-user="${esc(other.username)}">
          <input name="body" maxlength="1000" autocomplete="off" placeholder="${esc(t('msg.placeholder'))}" />
          <button class="btn" type="submit">${t('msg.send')}</button>
        </form>
      </div>`;
    const body = $('#tbody');
    const add = (msgs, scroll = true) => {
      if (!msgs.length) return;
      const empty = $('.empty', body);
      if (empty) empty.remove();
      body.insertAdjacentHTML('beforeend', msgs.filter((m) => !$(`[data-mid="${m.id}"]`, body)).map(bubble).join(''));
      lastId = Math.max(lastId, ...msgs.map((m) => m.id));
      if (scroll) body.scrollTop = body.scrollHeight;
    };
    if (data.messages.length) add(data.messages);
    else body.innerHTML = `<div class="empty">${t('msg.start')}</div>`;
    v.__thread = { add, getLast: () => lastId };
    state.thread = { add, getLast: () => lastId, user: other.username };
    pollUnread();
    state.timers.push(setInterval(async () => {
      try {
        const r = await api(`messages/${encodeURIComponent(other.username)}?after=${lastId}`);
        const near = body.scrollHeight - body.scrollTop - body.clientHeight < 120;
        add(r.messages, near);
        if (r.messages.length) pollUnread();
      } catch { /* ignore */ }
    }, 4000));
    $('input[name=body]', v).focus();
  }
  forms.message = async (f) => {
    const input = f.body;
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    try {
      const { message } = await api(`messages/${encodeURIComponent(f.dataset.user)}`, { method: 'POST', body: { body: text } });
      state.thread && state.thread.add([message]);
    } catch (e) { input.value = text; toast(errMsg(e)); }
  };

  const seg = location.pathname.split('/').filter(Boolean);
  let uname = '';
  try { uname = decodeURIComponent(seg[1] || ''); } catch { uname = seg[1] || ''; }
  if (!uname) return go('/messages', true);
  threadView(v, uname);
})();
