(async () => {
  const { $, esc, state, t, errMsg, api, toast, avatar, ago, accountPath, setTitle, badges, updateBadge, ICON } = window.BX;
  const v = await BX.init({ auth: 'required', shell: 'app', active: 'notifications' });
  if (!v) return;

  let kind = 'all';
  let cursor = null;
  let settings = null;
  let asked = true;

  // O que cada tipo de aviso diz. O nome da pessoa vem em negrito antes do texto.
  const TEXT = {
    follow: () => 'seguiu você',
    follow_post: () => 'seguiu você por esta publicação',
    like: () => 'curtiu sua publicação',
    repost: () => 'republicou sua publicação',
    comment: (n) => `comentou “${esc(n.body)}” na sua publicação`,
  };
  const TYPE_ICON = { follow: ICON.userplus, follow_post: ICON.userplus, like: ICON.heart, repost: ICON.repost, comment: ICON.comment };

  const SETTINGS_ROWS = [
    ['follow', 'Novos seguidores', 'Quando alguém começar a seguir você.'],
    ['follow_post', 'Seguiu por uma publicação', 'Quando alguém seguir você a partir de um post seu.'],
    ['repost', 'Republicações', 'Quando alguém republicar um post seu.'],
    ['comment', 'Comentários', 'Quando alguém comentar em um post seu.'],
    ['like', 'Curtidas', 'Quando alguém curtir um post seu.'],
    ['only_following', 'Somente de quem eu sigo', 'Ignora avisos de pessoas que você não segue.'],
  ];

  async function saveSettings(patch) {
    const r = await api('notifications/settings', { method: 'PATCH', body: patch });
    settings = r.settings;
    asked = true;
    return r;
  }

  function postPreview(n) {
    if (!n.post) return '';
    const text = (n.post.body || '').trim();
    return `<button type="button" class="notif-post" data-open-post="${n.post.id}" aria-label="Abrir publicação">
      ${n.post.image ? `<img src="${esc(n.post.image)}" alt="" loading="lazy" />` : ''}
      <span>${text ? esc(text.length > 90 ? `${text.slice(0, 90)}…` : text) : (n.post.image ? 'Foto' : 'Publicação')}</span>
    </button>`;
  }

  function itemHTML(n) {
    const isFollow = n.type === 'follow' || n.type === 'follow_post';
    const side = n.post
      ? postPreview(n)
      : (isFollow ? `<button type="button" class="btn sm ${n.following ? 'ghost' : ''}" data-act="follow" data-user="${esc(n.user.username)}" data-fm="1">${esc(n.following ? t('unfollow') : t('followBack'))}</button>` : '');
    return `<article class="notif ${n.read ? '' : 'unread'}" data-notif="${n.id}">
      <a class="notif-avatar" href="${accountPath(n.user.username)}" aria-label="${esc(n.user.name)}">${avatar(n.user)}<i class="notif-type" aria-hidden="true">${TYPE_ICON[n.type] || ''}</i></a>
      <div class="notif-main">
        <p><a href="${accountPath(n.user.username)}"><b>${esc(n.user.name)}</b>${badges(n.user)}</a> ${(TEXT[n.type] || (() => ''))(n)}</p>
        <small>@${esc(n.user.username)} · ${ago(n.created_at)}</small>
        ${isFollow && n.post ? `<button type="button" class="btn sm ${n.following ? 'ghost' : ''} notif-follow" data-act="follow" data-user="${esc(n.user.username)}" data-fm="1">${esc(n.following ? t('unfollow') : t('followBack'))}</button>` : ''}
      </div>
      <div class="notif-side">${side}</div>
    </article>`;
  }

  function promptHTML() {
    if (asked) {
      if (settings && !settings.enabled) {
        return `<aside class="notif-banner"><div><b>Notificações desativadas</b><p>Você não está recebendo avisos novos nesta seção.</p></div><button class="btn sm" type="button" data-notif-enable>Ativar</button></aside>`;
      }
      return '';
    }
    return `<aside class="notif-banner notif-ask" role="region" aria-label="Ativar notificações">
      <div><b>Ativar notificações para esta seção?</b><p>Receba avisos quando alguém seguir você, curtir, republicar ou comentar nas suas publicações.</p></div>
      <div class="notif-ask-actions">
        <button class="btn sm" type="button" data-notif-enable>Ativar</button>
        <button class="btn sm ghost" type="button" data-notif-custom>Personalizar</button>
        <button class="btn sm ghost" type="button" data-notif-later>Agora não</button>
      </div>
    </aside>`;
  }

  function emptyHTML() {
    const msg = kind === 'follows' ? 'Quando alguém seguir você, aparece aqui.' : kind === 'interactions' ? 'Curtidas, republicações e comentários aparecem aqui.' : 'Quando alguém seguir, curtir, republicar ou comentar nas suas publicações, você vê aqui.';
    return `<div class="empty"><b>Nenhuma notificação ainda</b>${msg}</div>`;
  }

  function view() {
    setTitle(t('nav.notifications'));
    v.innerHTML = `
      <div class="page-head"><div><h1>${t('nav.notifications')}</h1><small>Seguidores e interações com suas publicações</small></div>
        <div class="notif-head-actions">
          <button type="button" class="icon-btn" data-notif-custom aria-label="Personalizar notificações" title="Personalizar">${ICON.cog}</button>
          <button type="button" class="icon-btn" data-notif-clear aria-label="Limpar notificações" title="Limpar tudo">${ICON.trash}</button>
        </div></div>
      <div id="notif-prompt"></div>
      <div class="tabs" role="tablist">
        <button data-kind="all" class="on">Todas</button>
        <button data-kind="follows">Seguidores</button>
        <button data-kind="interactions">Interações</button>
      </div>
      <div id="notif-list"></div><div id="notif-more"></div>`;
  }

  async function load(reset) {
    const list = $('#notif-list'), more = $('#notif-more');
    if (reset) { cursor = null; list.innerHTML = `<div class="loading">${t('loading')}</div>`; more.innerHTML = ''; }
    try {
      const qs = `kind=${kind}${cursor ? `&before=${cursor}` : ''}`;
      const data = await api(`notifications?${qs}`);
      settings = data.settings; asked = data.asked;
      $('#notif-prompt').innerHTML = promptHTML();
      if (reset) list.innerHTML = '';
      if (reset && !data.notifications.length) list.innerHTML = emptyHTML();
      list.insertAdjacentHTML('beforeend', data.notifications.map(itemHTML).join(''));
      if (data.notifications.length) cursor = data.notifications[data.notifications.length - 1].id;
      more.innerHTML = data.more ? `<div class="more"><button class="btn ghost" type="button" data-notif-more>${t('loadMore')}</button></div>` : '';
      // Depois de mostrar, marca tudo como lido (os novos continuam destacados nesta visita).
      if (data.unread > 0) {
        api('notifications/read', { method: 'POST' }).then(() => { state.unreadNotif = 0; updateBadge(); }).catch(() => {});
      }
    } catch (e) {
      if (reset) list.innerHTML = `<div class="empty">${esc(errMsg(e))}</div>`;
      else toast(errMsg(e));
    }
  }

  function openCustomize() {
    const sheet = BX.openSheet('Personalizar notificações');
    const rows = SETTINGS_ROWS.map(([key, title, desc]) => `
      <label class="notif-opt"><span><b>${title}</b><small>${desc}</small></span><input type="checkbox" data-opt="${key}" ${settings[key] ? 'checked' : ''} /></label>`).join('');
    sheet.body.innerHTML = `
      <div class="notif-sheet">
        <label class="notif-opt notif-master"><span><b>Ativar notificações nesta seção</b><small>Desligue para parar de receber avisos novos.</small></span><input type="checkbox" data-opt="enabled" ${settings.enabled ? 'checked' : ''} /></label>
        <h3>O que você quer receber?</h3>
        ${rows}
        <h3>Avisos no aparelho</h3>
        <label class="notif-opt"><span><b>Notificações push</b><small>Receba um aviso no celular ou computador, mesmo com o Bloxter fechado.</small></span><input type="checkbox" data-opt="push" ${settings.push ? 'checked' : ''} /></label>
        <p class="notif-sheet-note" id="notif-sheet-note" role="status"></p>
      </div>`;
    const note = $('#notif-sheet-note', sheet.wrap);
    sheet.wrap.addEventListener('change', async (e) => {
      const input = e.target.closest('[data-opt]');
      if (!input) return;
      const key = input.dataset.opt;
      const value = input.checked;
      try {
        if (key === 'push' && value) {
          if (typeof Notification === 'undefined' || !window.isSecureContext) throw new Error('unsupported');
          const perm = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
          if (perm !== 'granted' || !(await BX.subscribePush())) throw new Error('denied');
        }
        await saveSettings({ [key]: value });
        note.textContent = 'Salvo.';
        $('#notif-prompt').innerHTML = promptHTML();
      } catch (err) {
        input.checked = !value;
        note.textContent = key === 'push' ? 'Não foi possível ativar as notificações neste aparelho. Verifique a permissão do navegador.' : errMsg(err);
      }
    });
  }

  v.addEventListener('click', async (e) => {
    const tab = e.target.closest('[data-kind]');
    if (tab) {
      kind = tab.dataset.kind;
      v.querySelectorAll('[data-kind]').forEach((b) => b.classList.toggle('on', b === tab));
      return load(true);
    }
    const open = e.target.closest('[data-open-post]');
    if (open) return BX.openPost(Number(open.dataset.openPost));
    if (e.target.closest('[data-notif-more]')) return load(false);
    if (e.target.closest('[data-notif-custom]')) {
      try { if (!settings) settings = (await api('notifications/settings')).settings; openCustomize(); } catch (err) { toast(errMsg(err)); }
      return;
    }
    if (e.target.closest('[data-notif-enable]')) {
      try { await saveSettings({ enabled: true }); $('#notif-prompt').innerHTML = promptHTML(); toast('Notificações ativadas.'); } catch (err) { toast(errMsg(err)); }
      return;
    }
    if (e.target.closest('[data-notif-later]')) {
      try { await saveSettings({ enabled: false }); $('#notif-prompt').innerHTML = promptHTML(); } catch (err) { toast(errMsg(err)); }
      return;
    }
    if (e.target.closest('[data-notif-clear]')) {
      if (!confirm('Apagar todas as suas notificações?')) return;
      try { await api('notifications', { method: 'DELETE' }); await load(true); toast('Notificações apagadas.'); } catch (err) { toast(errMsg(err)); }
    }
  });

  view();
  await load(true);
})();
