(async () => {
  const { $, root, esc, debounce, store, state, t, errMsg, api, toast, ICON, avatar, ago, hhmm, fmt, accountPath, toggles, langToggle, setTitle, go, safeNext, appShell, publicShell, refreshShellText, setActiveNav, updateBadge, pollUnread, userRow, usernameChecker, postHTML, loadMoreBtn, feed, loadPosts, setFeed, forms, actions, applyLang, applyTheme } = window.BX;
  const v = await BX.init({ auth: 'required', shell: 'app', active: 'settings' });
  if (!v) return;
  function settingsView(v) {
    setTitle(t('settings.title'));
    const me = state.me;
    v.innerHTML = `
      <div class="page-head"><h1>${t('settings.title')}</h1></div>
      <div class="setting-tabs" role="tablist" aria-label="Abas das configurações">
        <button class="btn sm" type="button" role="tab" aria-selected="true" data-settings-tab="profile">${t('settings.profile')}</button>
        <button class="btn ghost sm" type="button" role="tab" aria-selected="false" data-settings-tab="my-info">Minhas Informações</button>
        <button class="btn ghost sm" type="button" role="tab" aria-selected="false" data-settings-tab="accessibility">Acessibilidade</button>
        <button class="btn ghost sm" type="button" role="tab" aria-selected="false" data-settings-tab="app">Aplicativo</button>
      </div>
      <div class="settings">
      <section data-settings-panel="profile" role="tabpanel">
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
          ${me.bannerup ? `<div class="banner-edit">
            <label>${t('settings.banner')} <span class="aitag">BannerUP</span></label>
            <div class="banner-prev" id="bn-prev">${me.banner ? `<img src="${esc(me.banner)}" alt="" />` : ''}</div>
            <div class="btns">
              <button class="btn ghost sm" type="button" data-act="pickbanner">${t('settings.changeBanner')}</button>
              ${me.banner ? `<button class="btn ghost sm" type="button" data-act="rmbanner">${t('settings.removeBanner')}</button>` : ''}
              <input type="file" id="banner-file" accept="image/png,image/jpeg,image/webp" hidden />
            </div>
            <div class="hint">${t('settings.bannerHint')}</div>
          </div>` : ''}
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

        <h3>${t('settings.account')}</h3>
        <div class="setting-row"><div><span>${esc(t('settings.loggedAs', { email: me.email }))}</span></div>
          <button class="btn ghost sm" data-act="logout">${t('logout')}</button></div>
        <h3>Privacidade e grupos</h3>
        <div class="setting-card group-privacy-card"><div class="setting-card-copy"><b>Permitir adição direta em grupos</b><span>Desativado: você recebe um convite e decide se quer entrar. Ativado: pessoas podem adicionar você diretamente.</span></div><label class="switch-control"><input id="allow-group-adds" type="checkbox" ${me.allow_direct_group_adds ? 'checked' : ''}><span aria-hidden="true"></span><em>${me.allow_direct_group_adds ? 'Ativado' : 'Convite obrigatório'}</em></label></div>
        <h3>Assistente</h3>
        <div class="setting-card"><div class="setting-card-copy"><b>Converse com a LIA</b><span>Ajuda com as ferramentas e configurações do Bloxter.</span></div><a class="btn ghost" href="/support">Abrir LIA</a></div>
      </section>
      <section data-settings-panel="my-info" role="tabpanel" hidden>
        <h3>Minhas Informações</h3>
        <div class="box settings-info-box">
          <h4>O que eu compartilho sobre mim</h4>
          <p class="hint">Escolha as informações que aparecem no seu perfil: categoria do roleplay, Instagram e conta do Roblox.</p>
          <div class="settings-info-summary">
            <div><b>Categoria</b><span>${esc(me.rp_category || 'Não informada')}</span></div>
            <div><b>Instagram</b><span>${me.instagram ? `@${esc(me.instagram)}` : 'Não informado'}</span></div>
            <div><b>Roblox</b><span>${me.roblox_username ? `@${esc(me.roblox_username)}` : 'Não vinculado'}</span></div>
          </div>
          <button class="btn" type="button" id="settings-profile-details">Editar minhas informações</button>
        </div>
      </section>
      <section data-settings-panel="accessibility" role="tabpanel" hidden>
        <h3>Acessibilidade e aparência</h3>
        <p class="hint settings-intro">Ajuste o idioma e a aparência do Bloxter. As mudanças são aplicadas imediatamente e ficam salvas neste dispositivo.</p>
        <div class="setting-card">
          <div class="setting-card-copy"><b>${t('settings.language')}</b><span>Escolha o idioma dos menus e textos do site.</span></div>
          <div class="setting-control">${langToggle()}</div>
        </div>
        <div class="setting-card">
          <div class="setting-card-copy"><b>${t('settings.theme')}</b><span>Escolha o modo que fica mais confortável para você.</span></div>
          <div class="pill-toggle seg-theme setting-control">
            <button type="button" data-act="themeset" data-val="dark" class="${state.theme === 'dark' ? 'on' : ''}">${t('settings.themeDark')}</button>
            <button type="button" data-act="themeset" data-val="light" class="${state.theme === 'light' ? 'on' : ''}">${t('settings.themeLight')}</button>
          </div>
        </div>
      </section>
      <section data-settings-panel="app" role="tabpanel" hidden>
        <h3>Aplicativo</h3>
        <p class="hint settings-intro">Instale o Bloxter no seu aparelho para abrir direto da tela inicial, em tela cheia e com carregamento mais rápido.</p>
        <div class="setting-card">
          <div class="setting-card-copy"><b>Instalar o Bloxter</b><span id="app-tab-status">Verificando…</span></div>
          <button class="btn" type="button" id="app-tab-install">Instalar app</button>
        </div>
        <div class="setting-card">
          <div class="setting-card-copy"><b>Informações do aplicativo</b><span>Versão, modo offline, atualização e passo a passo de instalação.</span></div>
          <a class="btn ghost" href="/app">Abrir /app</a>
        </div>
      </section>
      </div>`;
    const tabButtons = [...v.querySelectorAll('[data-settings-tab]')];
    const selectSettingsTab = (tab) => {
      const selected = tab.dataset.settingsTab;
      tabButtons.forEach((item) => {
        const activeTab = item === tab;
        item.setAttribute('aria-selected', String(activeTab));
        item.classList.toggle('ghost', !activeTab);
      });
      v.querySelectorAll('[data-settings-panel]').forEach((panel) => { panel.hidden = panel.dataset.settingsPanel !== selected; });
      tab.scrollIntoView({ inline: 'center', block: 'nearest' });
      history.replaceState(null, '', selected === 'profile' ? '/settings' : `/settings#${selected}`);
    };
    tabButtons.forEach((tab) => tab.addEventListener('click', () => selectSettingsTab(tab)));
    const requestedTab = location.hash.slice(1);
    const initialTab = tabButtons.find((tab) => tab.dataset.settingsTab === requestedTab);
    if (initialTab) selectSettingsTab(initialTab);
    usernameChecker($('#s-user'), $('#s-hint'), { selfName: me.username });
    const appStatus = $('#app-tab-status');
    const appBtn = $('#app-tab-install');
    const renderAppTab = () => {
      if (!appStatus.isConnected) return;
      const P = window.BXPWA;
      if (P && P.isStandalone()) {
        appStatus.textContent = 'Você já está usando o aplicativo.';
        appBtn.hidden = true;
        return;
      }
      appBtn.hidden = false;
      appStatus.textContent = P && P.canPrompt() ? 'Disponível para instalar neste aparelho.' : 'Veja o passo a passo para o seu aparelho.';
      appBtn.textContent = P && P.canPrompt() ? 'Instalar app' : 'Como instalar';
    };
    appBtn.addEventListener('click', async () => {
      const P = window.BXPWA;
      if (P && P.canPrompt()) {
        const outcome = await P.install();
        if (outcome === 'accepted') toast('Instalando o Bloxter…');
        renderAppTab();
      } else go('/app#instalar');
    });
    renderAppTab();
    if (window.BXPWA) window.BXPWA.onChange(renderAppTab);
    $('#photo').addEventListener('change', onPhoto);
    const bf = $('#banner-file');
    if (bf) bf.addEventListener('change', onBanner);
    $('#settings-profile-details').addEventListener('click', () => BX.openProfileDetails({ user: state.me }));
    $('#allow-group-adds').addEventListener('change', async (event) => {
      const toggle = event.currentTarget;
      toggle.disabled = true;
      try {
        const { user } = await api('me', { method: 'PATCH', body: { allow_direct_group_adds: toggle.checked } });
        state.me = user;
        const label = toggle.closest('.switch-control').querySelector('em');
        label.textContent = toggle.checked ? 'Ativado' : 'Convite obrigatório';
        toast('Preferência de grupos atualizada.');
      } catch (error) { toggle.checked = !toggle.checked; toast(errMsg(error)); }
      finally { toggle.disabled = false; }
    });
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

  function onBanner(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      // Recorta no centro em 3:1 e reduz para 1200×400.
      const W = 1200, H = 400;
      const c = document.createElement('canvas');
      c.width = W; c.height = H;
      const ctx = c.getContext('2d');
      let sw = img.width, sh = img.width / 3;
      if (sh > img.height) { sh = img.height; sw = img.height * 3; }
      ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, 0, 0, W, H);
      const data = c.toDataURL('image/jpeg', 0.82);
      URL.revokeObjectURL(url);
      const f = $('form[data-form=profile]');
      f.dataset.banner = data;
      $('#bn-prev').innerHTML = `<img src="${data}" alt="" />`;
    };
    img.onerror = () => { URL.revokeObjectURL(url); toast(t('err.invalid_banner')); };
    img.src = url;
    e.target.value = '';
  }

  forms.profile = async (f) => {
      const btn = $('button[type=submit]', f);
      btn.disabled = true;
      try {
        const body = { name: f.name.value, username: f.username.value, bio: f.bio.value, link: f.link.value };
        if (f.dataset.avatar === 'remove') body.avatar = null;
        else if (f.dataset.avatar) body.avatar = f.dataset.avatar;
        if (f.dataset.banner === 'remove') body.banner = null;
        else if (f.dataset.banner) body.banner = f.dataset.banner;
        const { user } = await api('me', { method: 'PATCH', body });
        state.me = user;
        delete f.dataset.avatar;
        delete f.dataset.banner;
        toast(t('settings.saved'));
        appShell();
        refreshShellText();
        settingsView($('#view'));
      } catch (e) { toast(errMsg(e)); btn.disabled = false; }
  };

  settingsView(v);
})();
