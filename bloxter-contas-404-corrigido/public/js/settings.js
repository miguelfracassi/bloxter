(async () => {
  const { $, root, esc, debounce, store, state, t, errMsg, api, toast, ICON, avatar, ago, hhmm, fmt, accountPath, toggles, langToggle, setTitle, go, safeNext, appShell, publicShell, refreshShellText, setActiveNav, updateBadge, pollUnread, userRow, usernameChecker, postHTML, loadMoreBtn, feed, loadPosts, setFeed, forms, actions, applyLang, applyTheme } = window.BX;
  const v = await BX.init({ auth: 'required', shell: 'app', active: 'settings' });
  if (!v) return;
  function settingsView(v) {
    setTitle(t('settings.title'));
    const me = state.me;
    v.innerHTML = `
      <div class="page-head"><h1>${t('settings.title')}</h1></div>
      <div class="settings">
        <h3>${t('settings.profile')}</h3>
        <form data-form="profile" novalidate>
          <div class="avatar-edit">
            <span id="av-prev">${avatar(me, 's64')}</span>
            <div class="btns">
              <button class="btn ghost sm" type="button" data-act="pickphoto">${t('settings.changePhoto')}</button>
              ${me.avatar ? `<button class="btn ghost sm" type="button" data-act="rmphoto">${t('settings.removePhoto')}</button>` : ''}
              <input type="file" id="photo" accept="image/png,image/jpeg,image/webp" hidden />
            </div>
          </div>
          <div class="field"><label for="s-name">${t('auth.name')}</label>
            <input id="s-name" name="name" maxlength="50" value="${esc(me.name)}" /></div>
          <div class="field"><label for="s-user">${t('auth.username')}</label>
            <div class="prefix-wrap"><span>@</span><input id="s-user" name="username" maxlength="20" autocapitalize="none" spellcheck="false" value="${esc(me.username)}" /></div>
            <div class="hint" id="s-hint">${t('user.hint')}</div></div>
          <div class="field"><label for="s-bio">${t('settings.bio')}</label>
            <textarea id="s-bio" name="bio" maxlength="160">${esc(me.bio)}</textarea></div>
          <div class="field"><label for="s-link">${t('settings.link')}</label>
            <input id="s-link" name="link" maxlength="200" placeholder="${esc(t('settings.linkPh'))}" value="${esc(me.link)}" /></div>
          <button class="btn" type="submit">${t('settings.save')}</button>
        </form>

        <h3>${t('settings.appearance')}</h3>
        <div class="setting-row"><div>${t('settings.language')}</div>${langToggle()}</div>
        <div class="setting-row"><div>${t('settings.theme')}</div>
          <div class="pill-toggle seg-theme">
            <button data-act="themeset" data-val="dark" class="${state.theme === 'dark' ? 'on' : ''}">${t('settings.themeDark')}</button>
            <button data-act="themeset" data-val="light" class="${state.theme === 'light' ? 'on' : ''}">${t('settings.themeLight')}</button>
          </div></div>

        <h3>${t('settings.account')}</h3>
        <div class="setting-row"><div><span>${esc(t('settings.loggedAs', { email: me.email }))}</span></div>
          <button class="btn ghost sm" data-act="logout">${t('logout')}</button></div>
      </div>`;
    usernameChecker($('#s-user'), $('#s-hint'), { selfName: me.username });
    $('#photo').addEventListener('change', onPhoto);
  }

  function onPhoto(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const size = 256;
      const c = document.createElement('canvas');
      c.width = c.height = size;
      const ctx = c.getContext('2d');
      const s = Math.min(img.width, img.height);
      ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
      const data = c.toDataURL('image/jpeg', 0.86);
      URL.revokeObjectURL(url);
      const f = $('form[data-form=profile]');
      f.dataset.avatar = data;
      $('#av-prev').innerHTML = avatar({ ...state.me, avatar: data }, 's64');
    };
    img.onerror = () => { URL.revokeObjectURL(url); toast(t('err.invalid_avatar')); };
    img.src = url;
  }

  forms.profile = async (f) => {
      const btn = $('button[type=submit]', f);
      btn.disabled = true;
      try {
        const body = { name: f.name.value, username: f.username.value, bio: f.bio.value, link: f.link.value };
        if (f.dataset.avatar === 'remove') body.avatar = null;
        else if (f.dataset.avatar) body.avatar = f.dataset.avatar;
        const { user } = await api('me', { method: 'PATCH', body });
        state.me = user;
        delete f.dataset.avatar;
        toast(t('settings.saved'));
        appShell();
        refreshShellText();
        settingsView($('#view'));
      } catch (e) { toast(errMsg(e)); btn.disabled = false; }
  };

  settingsView(v);
})();
