(async () => {
  const { $, root, esc, debounce, store, state, t, errMsg, api, toast, ICON, avatar, ago, hhmm, fmt, accountPath, toggles, langToggle, setTitle, go, safeNext, appShell, publicShell, refreshShellText, setActiveNav, updateBadge, pollUnread, userRow, usernameChecker, postHTML, loadMoreBtn, feed, loadPosts, setFeed, forms, actions, applyLang, applyTheme } = window.BX;
  const v = await BX.init({ auth: 'guest', shell: 'public' });
  if (!v) return;

  setTitle('');
  v.innerHTML = `
    <section class="hero">
      <h1>${t('slogan')}</h1>
      <p>${t('heroSub')}</p>
      <div class="cta">
        <a class="btn lg" href="/signup">${t('signup')}</a>
        <a class="btn lg ghost" href="/login">${t('login')}</a>
      </div>
    </section>`;


})();
