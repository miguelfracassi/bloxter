(async () => {
  const { $, root, esc, debounce, store, state, t, errMsg, api, toast, ICON, avatar, ago, hhmm, fmt, accountPath, toggles, langToggle, setTitle, go, safeNext, appShell, publicShell, refreshShellText, setActiveNav, updateBadge, pollUnread, userRow, usernameChecker, postHTML, loadMoreBtn, feed, loadPosts, setFeed, forms, actions, applyLang, applyTheme } = window.BX;
  const v = await BX.init({ auth: 'required', shell: 'app', active: 'messages' });
  if (!v) return;
  async function conversationsView(v) {
    setTitle(t('msg.title'));
    v.innerHTML = `<div class="page-head"><h1>${t('msg.title')}</h1></div><div id="convs"><div class="loading">${t('loading')}</div></div>`;
    try {
      const { conversations } = await api('conversations');
      $('#convs').innerHTML = conversations.length
        ? conversations.map((c) => `
          <a class="conv" href="/messages/${encodeURIComponent(c.user.username)}">
            ${avatar(c.user)}
            <div class="info"><b>${esc(c.user.name)}${BX.badges(c.user)} <span style="display:inline;font-weight:400">@${esc(c.user.username)} · ${ago(c.created_at)}</span></b>
              <span>${c.mine ? t('msg.you') : ''}${esc(c.last)}</span></div>
            ${c.unread ? '<span class="dot"></span>' : ''}
          </a>`).join('')
        : `<div class="empty">${t('msg.empty')}</div>`;
    } catch (e) { $('#convs').innerHTML = `<div class="empty">${esc(errMsg(e))}</div>`; }
  }
  conversationsView(v);
})();
