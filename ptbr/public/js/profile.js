(async () => {
  const { $, root, esc, debounce, store, state, t, errMsg, api, toast, ICON, avatar, ago, hhmm, fmt, accountPath, toggles, langToggle, setTitle, go, safeNext, appShell, publicShell, refreshShellText, setActiveNav, updateBadge, pollUnread, userRow, usernameChecker, postHTML, loadMoreBtn, feed, loadPosts, setFeed, forms, actions, applyLang, applyTheme } = window.BX;
  const v = await BX.init({ auth: 'required', shell: 'app' });
  if (!v) return;
  async function profileView(v, uname) {
    v.innerHTML = `<div class="loading">${t('loading')}</div>`;
    let user;
    try {
      ({ user } = await api(`users/${encodeURIComponent(uname)}`));
    } catch (e) {
      setTitle(t('profile.notfound'));
      v.innerHTML = `<div class="page-head"><h1>${t('nav.profile')}</h1></div>
        <div class="empty"><b>${t('profile.notfound')}</b>${t('profile.notfoundText')}</div>`;
      return;
    }
    if (user.username !== uname) history.replaceState({}, '', accountPath(user.username));
    setTitle(`${user.name} (@${user.username})`);
    const joined = new Date(user.created_at).toLocaleDateString(state.lang === 'pt' ? 'pt-BR' : 'en-US', { month: 'long', year: 'numeric' });
    let linkHost = '';
    if (user.link) { try { linkHost = new URL(user.link).host.replace(/^www\./, ''); } catch { linkHost = user.link; } }
    v.innerHTML = `
      <div class="page-head"><h1>${esc(user.name)}${BX.badges(user)}<small><span id="c-posts">${user.posts}</span> ${t('posts')}</small></h1></div>
      <div class="profile-top">
        <div class="profile-band"></div>
        <div class="profile-row">
          ${avatar(user, 's120')}
          <div class="btns">
            ${user.is_me
              ? `<a class="btn ghost sm" href="/settings">${t('editProfile')}</a><button class="btn sm" type="button" data-profile-details>Personalizar perfil</button>`
              : `<a class="btn ghost sm" href="/chat?u=${encodeURIComponent(user.username)}">${t('message')}</a>
                 <button class="btn sm ${user.is_following ? 'ghost' : ''}" data-act="follow" data-user="${esc(user.username)}" data-profile="1" data-fm="${user.follows_me ? 1 : ''}">${BX.followLabel(user)}</button>
                 <button class="btn ghost sm profile-dots" type="button" data-act="reportuser" data-user="${esc(user.username)}" aria-label="${esc(t('report.menu.user', { u: user.username }))}" title="${esc(t('report.menu.user', { u: user.username }))}">${ICON.flag}</button>`}
          </div>
        </div>
        <h2>${esc(user.name)}${BX.badges(user)}</h2>
        <div class="handle">@${esc(user.username)}</div>
        ${user.bio ? `<div class="bio">${fmt(user.bio)}</div>` : ''}
        <div class="meta">
          ${user.link ? `<span>🔗 <a href="${esc(user.link)}" target="_blank" rel="noopener noreferrer nofollow">${esc(linkHost)}</a></span>` : ''}
          ${user.rp_category ? `<span>Categoria: ${esc(user.rp_category)}</span>` : ''}
          ${user.instagram ? `<span>📷 <a href="https://www.instagram.com/${encodeURIComponent(user.instagram)}/" target="_blank" rel="noopener noreferrer nofollow">@${esc(user.instagram)}</a></span>` : ''}
          ${user.roblox_username ? `<span class="roblox-profile">${user.roblox_avatar ? `<img src="${esc(user.roblox_avatar)}" alt="" />` : ''}<a href="https://www.roblox.com/users/${encodeURIComponent(user.roblox_user_id || '')}/profile" target="_blank" rel="noopener noreferrer nofollow">Roblox: @${esc(user.roblox_username)}</a></span>` : ''}
          <span>${t('joined', { date: esc(joined) })}</span>
        </div>
        <div class="counts">
          <span class="count-link" role="button" tabindex="0" data-act="plist" data-val="followers"><b id="c-followers">${Number(user.followers).toLocaleString(state.lang === 'pt' ? 'pt-BR' : 'en-US')}</b> ${t('followers')}</span>
          <span class="count-link" role="button" tabindex="0" data-act="plist" data-val="following"><b>${user.following}</b> ${t('followingLbl')}</span>
        </div>
      </div>
      <div class="tabs profile-tabs" role="tablist">
        <button type="button" role="tab" class="on" data-act="ptab" data-val="posts">${t('profile.postsTab')}</button>
        <button type="button" role="tab" data-act="ptab" data-val="reposts">${t('repost.tab')} <small class="tab-count" id="c-reposts">${Number(user.reposts || 0)}</small></button>
      </div>
      <div id="posts"></div><div id="more"></div>`;
    v.querySelector('[data-profile-details]')?.addEventListener('click', () => BX.openProfileDetails({ user }));
    // Abas do perfil: posts do usuário x posts que ele republicou.
    const postsEmpty = `<div class="empty"><b>${t('home.emptyTitle')}</b></div>`;
    const repostsEmpty = `<div class="empty"><b>${t('repost.emptyTitle')}</b>${t('repost.emptyText')}</div>`;
    const showTab = (name) => {
      v.querySelectorAll('.profile-tabs button').forEach((b) => {
        const on = b.dataset.val === name;
        b.classList.toggle('on', on);
        b.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      feed.endpoint = `users/${encodeURIComponent(user.username)}/${name === 'reposts' ? 'reposts' : 'posts'}`;
      feed.emptyHTML = name === 'reposts' ? repostsEmpty : postsEmpty;
      loadPosts(true);
    };
    actions.ptab = (el) => showTab(el.dataset.val);
    actions.plist = (el) => {
      const kind = el.dataset.val === 'following' ? 'following' : 'followers';
      const sheet = BX.openSheet(t(kind === 'following' ? 'list.following' : 'list.followers'));
      sheet.body.innerHTML = `<form class="search-form" role="search" onsubmit="return false"><input type="search" id="plist-q" placeholder="${esc(t('list.search'))}" autocomplete="off" /></form><div id="plist-rows" class="plist-rows"></div>`;
      const rows = sheet.body.querySelector('#plist-rows');
      let seq = 0;
      const run = async () => {
        const n = ++seq;
        const q = sheet.body.querySelector('#plist-q').value.trim();
        try {
          const { users } = await api(`users/${encodeURIComponent(user.username)}/${kind}?q=${encodeURIComponent(q)}`);
          if (n !== seq) return;
          rows.innerHTML = users.length ? users.map((u) => userRow({ ...u, is_me: true })).join('') : `<div class="empty">${esc(t('list.empty'))}</div>`;
        } catch (e) { if (n === seq) rows.innerHTML = `<div class="empty">${esc(errMsg(e))}</div>`; }
      };
      sheet.body.querySelector('#plist-q').addEventListener('input', debounce(run, 200));
      run();
    };
    showTab('posts');
  }
  const seg = location.pathname.split('/').filter(Boolean);
  let uname = '';
  try { uname = new URLSearchParams(location.search).get('u') || decodeURIComponent(seg[1] || ''); }
  catch { uname = seg[1] || ''; }
  if (!uname) return go(accountPath(state.me.username), true);
  setActiveNav(uname.toLowerCase() === state.me.username ? 'profile' : '');
  profileView(v, uname);
})();
