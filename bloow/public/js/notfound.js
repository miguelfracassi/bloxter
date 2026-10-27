(async () => {
  const { $, root, esc, debounce, store, state, t, errMsg, api, toast, ICON, avatar, ago, hhmm, fmt, accountPath, toggles, langToggle, setTitle, go, safeNext, appShell, publicShell, refreshShellText, setActiveNav, updateBadge, pollUnread, userRow, usernameChecker, postHTML, loadMoreBtn, feed, loadPosts, setFeed, forms, actions, applyLang, applyTheme } = window.BX;
  const v = await BX.init({ auth: 'any', shell: 'public' });
  if (!v) return;

  setTitle(t('notfound.title'));
  v.innerHTML = `<div class="hero"><h1>404</h1><p>${t('notfound.text')}</p>
    <div class="cta"><a class="btn" href="${state.me ? '/home' : '/'}">${t('notfound.back')}</a></div></div>`;


})();
