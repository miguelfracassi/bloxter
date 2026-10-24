(async () => {
  const { $, esc, state, t, setTitle, go, feed, loadPosts, normalizeTag } = window.BX;
  const v = await BX.init({ auth: 'required', shell: 'app', active: 'search' });
  if (!v) return;

  // Aceita /hashtag?t=tag e /tag/tag (o vercel.json reescreve para a primeira forma).
  const seg = location.pathname.split('/').filter(Boolean);
  let raw = new URLSearchParams(location.search).get('t') || '';
  if (!raw && seg[0] === 'tag') { try { raw = decodeURIComponent(seg[1] || ''); } catch { raw = seg[1] || ''; } }
  const tag = normalizeTag(raw);
  if (!tag) return go('/search', true);
  if (tag !== raw) history.replaceState({}, '', BX.hashtagPath(tag));

  setTitle(`#${tag}`);
  v.innerHTML = `
    <div class="page-head"><h1>#${esc(tag)}<small id="tag-count"></small></h1></div>
    <div id="posts"></div><div id="more"></div>`;
  feed.endpoint = `hashtags/${encodeURIComponent(tag)}/posts`;
  feed.emptyHTML = `<div class="empty"><b>#${esc(tag)}</b>${t('tag.empty')}</div>`;
  feed.onData = (data, reset) => {
    if (reset && data.total != null) $('#tag-count').textContent = `${t('trend.posts', { n: data.total })} · ${t('trend.people', { n: data.users })}`;
  };
  loadPosts(true);
})();
