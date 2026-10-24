(async () => {
  const { $, root, esc, debounce, store, state, t, errMsg, api, toast, ICON, avatar, ago, hhmm, fmt, accountPath, toggles, langToggle, setTitle, go, safeNext, appShell, publicShell, refreshShellText, setActiveNav, updateBadge, pollUnread, userRow, usernameChecker, postHTML, loadMoreBtn, feed, loadPosts, setFeed, forms, actions, applyLang, applyTheme } = window.BX;
  const v = await BX.init({ auth: 'required', shell: 'app', active: 'search' });
  if (!v) return;
  function searchView(v) {
    setTitle(t('search.title'));
    const q0 = new URLSearchParams(location.search).get('q') || '';
    v.innerHTML = `
      <div class="page-head"><h1>${t('search.title')}</h1></div>
      <div class="searchbar"><form class="search-form" data-form="mainsearch" role="search">
        <input type="search" name="q" value="${esc(q0)}" placeholder="${esc(t('search.placeholder'))}" autocomplete="off" />
      </form></div>
      <div id="results"><div class="empty">${t('search.hint')}</div></div>`;
    const input = $('input[name=q]', v);
    let seq = 0;
    const run = async () => {
      const q = input.value.trim();
      const my = ++seq;
      const box = $('#results');
      if (!q) { box.innerHTML = `<div class="empty">${t('search.hint')}</div>`; return; }
      try {
        const { users } = await api(`search?q=${encodeURIComponent(q)}`);
        if (my !== seq) return;
        box.innerHTML = users.length ? users.map((u) => userRow(u)).join('') : `<div class="empty">${t('search.empty')}</div>`;
      } catch (e) { if (my === seq) box.innerHTML = `<div class="empty">${esc(errMsg(e))}</div>`; }
    };
    input.addEventListener('input', debounce(run, 300));
    if (q0) run();
    else input.focus();
  }
  forms.mainsearch = (f) => f.q.dispatchEvent(new Event('input'));

  searchView(v);
})();
