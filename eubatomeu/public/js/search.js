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
      <div id="results"></div>`;
    const input = $('input[name=q]', v);
    let seq = 0;
    // Espaço vazio da busca: Top # (hashtags em alta) com atalho para a página completa.
    let trendHTML = null;
    const showTrending = async () => {
      const box = $('#results'), my = ++seq;
      if (!state.features.hashtags) { box.innerHTML = `<div class="empty">${t('search.hint')}</div>`; return; }
      if (trendHTML === null) {
        box.innerHTML = `<div class="loading">${t('loading')}</div>`;
        try {
          const { tags } = await api('trending?range=week&limit=10');
          trendHTML = tags.length
            ? `<div class="trend-head"><h2>${esc(t('trend.title'))}</h2><a href="/trending">${esc(t('trend.more'))}</a></div>${tags.slice(0, 5).map((x) => `<a class="trend-row" href="/search?q=${encodeURIComponent('#' + x.tag)}"><span class="trend-rank">${x.rank}</span><span class="trend-info"><b>#${esc(x.tag)}</b><small>${esc(x.posts === 1 ? t('trend.post1') : t('trend.posts', { n: x.posts.toLocaleString() }))}</small></span></a>`).join('')}`
            : '';
        } catch { trendHTML = ''; }
      }
      if (my === seq) box.innerHTML = `${trendHTML}<div class="empty">${t('search.hint')}</div>`;
    };
    const run = async () => {
      const q = input.value.trim();
      const my = ++seq;
      const box = $('#results');
      if (!q) { showTrending(); return; }
      if (q.startsWith('#') && !state.features.hashtags) { box.innerHTML = `<div class="empty">${t('search.empty')}</div>`; return; }
      try {
        const { users, posts } = await api(`search?q=${encodeURIComponent(q)}`);
        if (my !== seq) return;
        if (q.startsWith('#')) {
          box.innerHTML = posts && posts.length
            ? `<div class="empty compact-empty" style="padding:12px 16px"><b>${esc(q)}</b> · ${posts.length}</div>${posts.map((p) => postHTML(p)).join('')}`
            : `<div class="empty">${t('search.empty')}</div>`;
          return;
        }
        box.innerHTML = users.length ? users.map((u) => userRow(u)).join('') : `<div class="empty">${t('search.empty')}</div>`;
      } catch (e) { if (my === seq) box.innerHTML = `<div class="empty">${esc(errMsg(e))}</div>`; }
    };
    input.addEventListener('input', debounce(run, 300));
    if (q0) run();
    else { showTrending(); input.focus(); }
  }
  forms.mainsearch = (f) => f.q.dispatchEvent(new Event('input'));

  searchView(v);
})();
