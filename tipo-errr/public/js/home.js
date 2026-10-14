(async () => {
  const { $, root, esc, debounce, store, state, t, errMsg, api, toast, ICON, avatar, ago, hhmm, fmt, accountPath, toggles, langToggle, setTitle, go, safeNext, appShell, publicShell, refreshShellText, setActiveNav, updateBadge, pollUnread, userRow, usernameChecker, postHTML, loadMoreBtn, feed, loadPosts, setFeed, forms, actions, applyLang, applyTheme } = window.BX;
  const v = await BX.init({ auth: 'required', shell: 'app', active: 'home' });
  if (!v) return;
  async function homeView(v) {
    setTitle(t('nav.home'));
    v.innerHTML = `
      <div class="page-head"><h1>${t('nav.home')}</h1></div>
      <form class="composer" data-form="post">
        ${avatar(state.me)}
        <div class="box">
          <textarea name="body" maxlength="500" rows="2" placeholder="${esc(t('home.placeholder'))}"></textarea>
          <div class="row"><span class="counter">500</span><button class="btn sm" type="submit">${t('post')}</button></div>
        </div>
      </form>
      <div class="tabs">
        <button data-act="tab" data-val="all" class="${state.feedTab === 'all' ? 'on' : ''}">${t('home.forYou')}</button>
        <button data-act="tab" data-val="following" class="${state.feedTab === 'following' ? 'on' : ''}">${t('home.following')}</button>
      </div>
      <div id="posts"></div><div id="more"></div>`;
    setFeed();
    loadPosts(true);
  }

  forms.post = async (f) => {
      const ta = f.body;
      const body = ta.value.trim();
      if (!body) return toast(t('err.post_empty'));
      const btn = $('button[type=submit]', f);
      btn.disabled = true;
      try {
        const { post } = await api('posts', { method: 'POST', body: { body } });
        ta.value = '';
        $('.counter', f).textContent = '500';
        const list = $('#posts');
        if (list) {
          const empty = $('.empty', list);
          if (empty) empty.remove();
          list.insertAdjacentHTML('afterbegin', postHTML(post));
        }
      } catch (e) { toast(errMsg(e)); }
      btn.disabled = false;
  };

  homeView(v);
})();
