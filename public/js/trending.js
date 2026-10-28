(async () => {
  const { $, esc, t, errMsg, api, setTitle } = window.BX;
  const v = await BX.init({ auth: 'required', shell: 'app', active: 'search' });
  if (!v) return;
  // Top # só existe depois que a administração libera as hashtags.
  if (!BX.state.features.hashtags) { BX.go('/search', true); return; }

  const RANGES = ['day', 'week', 'all'];
  let range = 'week';
  try { const r = localStorage.getItem('bx_trend_range'); if (RANGES.includes(r)) range = r; } catch { /* ignore */ }

  const counts = (x) => `${x.posts === 1 ? t('trend.post1') : t('trend.posts', { n: x.posts.toLocaleString() })} · ${x.people === 1 ? t('trend.people1') : t('trend.people', { n: x.people.toLocaleString() })}`;
  const itemHTML = (x) => `<a class="trend-row" href="/search?q=${encodeURIComponent('#' + x.tag)}">
      <span class="trend-rank">${x.rank}</span>
      <span class="trend-info"><b>#${esc(x.tag)}</b><small>${esc(counts(x))}</small></span>
    </a>`;

  setTitle(t('trend.title'));
  v.innerHTML = `
    <div class="page-head"><div><h1>${esc(t('trend.title'))}</h1><small>${esc(t('trend.sub'))}</small></div></div>
    <div class="tabs" role="tablist">${RANGES.map((r) => `<button data-range="${r}" class="${r === range ? 'on' : ''}">${esc(t(`trend.${r}`))}</button>`).join('')}</div>
    <div id="trend-list"></div>
    <div class="trend-back"><a href="/search">${esc(t('trend.back'))}</a></div>`;

  let seq = 0;
  async function load() {
    const list = $('#trend-list'), my = ++seq;
    list.innerHTML = `<div class="loading">${t('loading')}</div>`;
    try {
      const { tags } = await api(`trending?range=${range}&limit=30`);
      if (my !== seq) return;
      list.innerHTML = tags.length ? tags.map(itemHTML).join('') : `<div class="empty">${esc(t('trend.empty'))}</div>`;
    } catch (e) { if (my === seq) list.innerHTML = `<div class="empty">${esc(errMsg(e))}</div>`; }
  }
  v.addEventListener('click', (e) => {
    const b = e.target.closest('[data-range]');
    if (!b || b.dataset.range === range) return;
    range = b.dataset.range;
    try { localStorage.setItem('bx_trend_range', range); } catch { /* ignore */ }
    v.querySelectorAll('[data-range]').forEach((x) => x.classList.toggle('on', x === b));
    load();
  });
  load();
})();
