(async () => {
  const { $, root, esc, debounce, store, state, t, errMsg, api, toast, ICON, avatar, ago, hhmm, fmt, accountPath, toggles, langToggle, setTitle, go, safeNext, appShell, publicShell, refreshShellText, setActiveNav, updateBadge, pollUnread, userRow, usernameChecker, postHTML, loadMoreBtn, feed, loadPosts, setFeed, forms, actions, applyLang, applyTheme } = window.BX;
  const v = await BX.init({ auth: 'guest', shell: 'public' });
  if (!v) return;

  setTitle(t('login'));
  v.innerHTML = `
    <div class="auth-card">
      <h2>${t('auth.loginTitle')}</h2>
      <p class="sub">${t('auth.loginSub')}</p>
      <form data-form="login" novalidate>
        <div class="form-error" role="alert"></div>
        <div class="field"><label for="f-id">${t('auth.identifier')}</label>
          <input id="f-id" name="identifier" autocomplete="username" autocapitalize="none" required /></div>
        <div class="field"><label for="f-pass">${t('auth.password')}</label>
          <input id="f-pass" name="password" type="password" autocomplete="current-password" required /></div>
        <button class="btn block" type="submit">${t('login')}</button>
      </form>
      <p class="alt">${t('auth.noAccount')} <a href="/signup">${t('signup')}</a></p>
    </div>`;

  forms.login = async (f) => {
    const err = $('.form-error', f);
    const btn = $('button[type=submit]', f);
    err.textContent = '';
    btn.disabled = true;
    try {
      await api('auth/login', { method: 'POST', body: { identifier: f.identifier.value, password: f.password.value } });
      go(safeNext() || '/home', true);
    } catch (e) { err.textContent = errMsg(e); btn.disabled = false; }
  };
  setTimeout(() => $('#f-id')?.focus(), 30);


})();
