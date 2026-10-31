(async () => {
  const { $, root, esc, store, state, t, errMsg, api, toast, avatar, ago, accountPath, setTitle, setFeed, loadPosts, feed, postHTML, forms, appShell, refreshShellText } = window.BX;
  const v = await BX.init({ auth: 'required', shell: 'app', active: 'home' });
  if (!v) return;

  let storyGroups = [];
  let activeGroup = 0;
  let activeStory = 0;
  let progressTimer = null;
  let progressStarted = 0;
  let progressElapsed = 0;
  const STORY_MS = 6500;

  async function homeView(view) {
    setTitle(t('nav.home'));
    view.innerHTML = `
      <div class="page-head"><h1>${t('nav.home')}</h1>${BX.music.autoButton()}</div>
      <section class="stories-panel" aria-label="Stories">
        <div class="stories-heading"><div><h2>Stories</h2><p>Compartilhe um momento; ele desaparece em 24 horas.</p></div><button class="btn ghost sm" type="button" data-story-add>+ Criar story</button></div>
        <div class="story-strip" id="story-strip" aria-live="polite"><div class="story-loading">Carregando stories…</div></div>
      </section>
      <form class="composer" data-form="post">
        ${avatar(state.me)}
        <div class="box">
          <textarea name="body" maxlength="500" rows="2" placeholder="${esc(t('home.placeholder'))}"></textarea>
          <div class="composer-previews" id="composer-previews" hidden></div>
          <input type="url" id="composer-music" class="composer-music" placeholder="Link da música do YouTube" autocomplete="off" hidden />
          <div class="composer-music-msg" id="composer-music-msg" role="alert" hidden></div>
          <div id="composer-music-preview" hidden></div>
          <input type="text" id="composer-music-start" class="composer-music" placeholder="Começar em (ex.: 1:05)" inputmode="numeric" autocomplete="off" aria-label="Começar a música em" hidden />
          <div class="composer-collab" id="composer-collab" hidden>
            <div class="collab-chips" id="collab-chips"></div>
            <div class="collab-field">
              <input type="text" id="collab-input" placeholder="Buscar pessoa para convidar (até 5)" autocomplete="off" aria-label="Buscar pessoa para convidar" />
              <div class="collab-suggest" id="collab-suggest" hidden></div>
            </div>
            <small class="collab-hint">O convite chega pela conversa. O post só aparece no perfil de quem aceitar.</small>
          </div>
          <div class="row">
            <label class="icon-btn composer-photo" title="Adicionar fotos ou vídeo" aria-label="Adicionar fotos ou vídeo">${BX.ICON.image}<input type="file" id="composer-files" accept="image/png,image/jpeg,image/webp,video/mp4,video/webm,video/quicktime" multiple hidden /></label>
            <button type="button" class="icon-btn composer-music-btn" data-act="musictoggle" title="Adicionar música" aria-label="Adicionar música"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg></button><button type="button" class="icon-btn composer-collab-btn" data-act="collabtoggle" title="Convidar colaboradores" aria-label="Convidar colaboradores">${BX.ICON.people}<span class="collab-count" id="collab-count" hidden></span></button><span class="counter">500</span><button class="btn sm" type="submit">${t('post')}</button>
          </div>
        </div>
      </form>
      <div class="tabs">
        <button data-act="tab" data-val="all" class="${state.feedTab === 'all' ? 'on' : ''}">${t('home.forYou')}</button>
        <button data-act="tab" data-val="following" class="${state.feedTab === 'following' ? 'on' : ''}">${t('home.following')}</button>
      </div>
      <div id="posts"></div><div id="more"></div>`;
    loadSitePopup(view);
    setupPageUp(view);
    setupComposerPhotos(view);
    setFeed();
    loadPosts(true);
    // Banner "Seja verificado": só aparece se o administrador ligou e a pessoa ainda não é verificada.
    if (window.BXVerifiedOffer) {
      BXVerifiedOffer.mount(view, { api, state, toast, errMsg, onVerified: () => { loadPosts(true); refreshShellText(); } });
    }
    await loadStories();
  }

  // Popup criado em /administracao (imagem, texto, link e duração). Some sozinho quando a duração acaba.
  async function loadSitePopup(view) {
    let popup = null;
    try { popup = (await api('popup')).popup; } catch { return; }
    if (!popup) return;
    const key = `bx_popup_${popup.id}`;
    try { if (sessionStorage.getItem(key) === '1') return; } catch { /* sem sessionStorage */ }
    if (!view.isConnected) return;
    const external = /^https?:\/\//i.test(popup.link);
    const link = popup.link ? ` <a class="election-link" href="${esc(popup.link)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${esc(popup.link_label || 'Saiba mais')}</a>` : '';
    const html = `<aside class="election-card site-popup" id="site-popup" aria-label="Aviso">
        ${popup.image ? `<img class="election-urna site-popup-img" src="${esc(popup.image)}" alt="" loading="lazy" />` : ''}
        <p class="election-text" style="white-space:pre-line">${esc(popup.text)}${link}</p>
        <button class="election-close" type="button" aria-label="Fechar aviso" data-popup-close>×</button>
      </aside>`;
    const anchor = view.querySelector('.stories-panel');
    if (anchor) anchor.insertAdjacentHTML('afterend', html); else view.insertAdjacentHTML('afterbegin', html);
    view.querySelector('[data-popup-close]')?.addEventListener('click', () => {
      view.querySelector('#site-popup')?.remove();
      try { sessionStorage.setItem(key, '1'); } catch { /* ignore */ }
    });
  }

  // PageUP: quem tem a função digita * no post e escolhe uma página do site para mencionar.
  function setupPageUp(view) {
    if (!state.me || !state.me.pageup) return;
    const ta = view.querySelector('textarea[name=body]');
    if (!ta) return;
    const box = ta.parentElement;
    box.style.position = 'relative';
    const menu = document.createElement('div');
    menu.className = 'pageup-menu';
    menu.hidden = true;
    box.appendChild(menu);
    const hint = document.createElement('small');
    hint.className = 'pageup-hint';
    hint.textContent = 'PageUP ativo: digite * para mencionar uma página do site.';
    box.appendChild(hint);
    const pages = window.BX.PAGEUP_PAGES;
    const current = () => {
      const m = ta.value.slice(0, ta.selectionStart).match(/(^|\s)\*([a-z0-9_-]*)$/i);
      return m ? { q: m[2].toLowerCase(), start: ta.selectionStart - m[2].length - 1 } : null;
    };
    const close = () => { menu.hidden = true; menu.innerHTML = ''; };
    const refresh = () => {
      const cur = current();
      if (!cur) return close();
      const list = pages.filter((p) => !cur.q || p.key.includes(cur.q) || p.label.toLowerCase().includes(cur.q));
      if (!list.length) return close();
      menu.innerHTML = list.map((p) => `<button type="button" data-pick="${esc(p.key)}"><b>*${esc(p.label)}</b><span>${esc(p.path)}</span></button>`).join('');
      menu.hidden = false;
    };
    menu.addEventListener('mousedown', (event) => {
      const btn = event.target.closest('[data-pick]');
      if (!btn) return;
      event.preventDefault();
      const cur = current();
      if (!cur) return close();
      const before = ta.value.slice(0, cur.start);
      const after = ta.value.slice(ta.selectionStart);
      const insert = `*${btn.dataset.pick} `;
      ta.value = before + insert + after;
      ta.selectionStart = ta.selectionEnd = before.length + insert.length;
      ta.dispatchEvent(new Event('input', { bubbles: true }));
      close();
      ta.focus();
    });
    ta.addEventListener('input', refresh);
    ta.addEventListener('click', refresh);
    ta.addEventListener('keyup', (event) => { if (event.key !== 'Escape') refresh(); });
    ta.addEventListener('keydown', (event) => { if (event.key === 'Escape') close(); });
    ta.addEventListener('blur', () => setTimeout(close, 120));
  }

  async function loadStories() {
    const strip = $('#story-strip');
    if (!strip) return;
    try {
      const { stories = [] } = await api('stories');
      if (stories.some((story) => story.music)) BX.music.prepare();
      const byUser = new Map();
      for (const story of stories) {
        const key = String(story.user.id);
        if (!byUser.has(key)) byUser.set(key, { user: story.user, stories: [] });
        byUser.get(key).stories.push(story);
      }
      storyGroups = [...byUser.values()];
      const mine = storyGroups.findIndex((group) => Number(group.user.id) === Number(state.me.id));
      if (mine > 0) storyGroups.unshift(storyGroups.splice(mine, 1)[0]);
      const myStories = storyGroups[0] && Number(storyGroups[0].user.id) === Number(state.me.id);
      const ownCount = myStories ? storyGroups[0].stories.length : 0;
      const ownViewed = myStories && storyGroups[0].stories.every((s) => s.viewed);
      strip.innerHTML = `
        <button class="story-item story-own" type="button" ${ownCount ? 'data-story-group="0" aria-label="Ver meu story"' : 'data-story-add aria-label="Criar story"'}>
          <span class="story-avatar-wrap ${ownCount ? (ownViewed ? 'seen' : 'unseen') : 'empty'}">${avatar(state.me, 's64')}<i data-story-add role="button" aria-label="Criar story">+</i></span>
          <span class="story-label">${ownCount ? 'Seu story' : 'Adicionar'}</span>
          ${ownCount ? `<span class="story-sub">${ownCount} ${ownCount === 1 ? 'story' : 'stories'}</span>` : ''}
        </button>
        ${storyGroups.map((group, index) => Number(group.user.id) === Number(state.me.id) ? '' : `
          <button class="story-item" type="button" data-story-group="${index}" aria-label="Ver stories de ${esc(group.user.name)}">
            <span class="story-avatar-wrap ${group.stories.every((s) => s.viewed) ? 'seen' : 'unseen'}">${avatar(group.user, 's64')}</span>
            <span class="story-label">${esc(group.user.name || group.user.username)}</span>
            <span class="story-sub">${group.stories.length} ${group.stories.length === 1 ? 'story' : 'stories'}</span>
          </button>`).join('')}
        ${storyGroups.length <= (myStories ? 1 : 0) ? '<div class="story-empty">Stories de pessoas que você segue aparecem aqui.</div>' : ''}`;
    } catch (e) {
      strip.innerHTML = `<div class="story-empty">Não foi possível carregar stories${e && e.detail ? ` (${esc(e.detail)})` : ''}. <button type="button" class="story-retry" id="story-retry">Tentar de novo</button></div>`;
      $('#story-retry')?.addEventListener('click', loadStories);
    }
  }

  function resizeStoryImage(file) {
    return new Promise((resolve, reject) => {
      const src = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => {
        const max = 1440;
        const scale = Math.min(1, max / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(src);
        // reduz a qualidade até caber no limite do servidor (~2 MB de texto)
        let out = '';
        for (const quality of [0.82, 0.7, 0.55, 0.4]) {
          out = canvas.toDataURL('image/jpeg', quality);
          if (out.length < 1500000) break;
        }
        resolve(out);
      };
      image.onerror = () => { URL.revokeObjectURL(src); reject(new Error('invalid_image')); };
      image.src = src;
    });
  }

  function openStoryComposer() {
    document.getElementById('story-compose-modal')?.remove();
    const modal = document.createElement('div');
    modal.id = 'story-compose-modal';
    modal.className = 'story-modal story-compose-modal';
    modal.innerHTML = `
      <section class="story-compose-card" role="dialog" aria-modal="true" aria-labelledby="story-compose-title">
        <header><div><h2 id="story-compose-title">Criar story</h2><p>Seu story fica disponível por 24 horas.</p></div><button class="story-close" type="button" aria-label="Fechar">×</button></header>
        <form id="story-compose-form">
          <label class="story-upload" for="story-image"><span class="story-upload-icon">＋</span><b>Adicionar foto</b><small>JPG, PNG ou WebP</small><input id="story-image" type="file" accept="image/png,image/jpeg,image/webp" hidden></label>
          <div id="story-preview" class="story-preview" hidden></div>
          <label for="story-body">Texto (opcional)</label><textarea id="story-body" maxlength="300" placeholder="O que você quer compartilhar?"></textarea>
          <div class="story-compose-counter"><span>Opcional</span><span id="story-body-count">0/300</span></div>
          <label for="story-link">Link (opcional)</label><input id="story-link" type="text" maxlength="200" placeholder="seusite.com ou https://…" inputmode="url" autocapitalize="off" autocomplete="off" spellcheck="false">
          <label for="story-music">Música do YouTube (opcional)</label><input id="story-music" type="url" maxlength="300" placeholder="Cole o link da música" inputmode="url" autocapitalize="off" autocomplete="off" spellcheck="false">
          <small class="story-music-hint">Quem assistir pode tocar a música pelo controle no story.</small>
          <p class="story-form-error" id="story-form-error" role="alert"></p>
          <footer><button class="btn ghost" type="button" data-story-cancel>Cancelar</button><button class="btn" type="submit">Publicar story</button></footer>
        </form>
      </section>`;
    document.body.appendChild(modal);
    const form = modal.querySelector('#story-compose-form');
    let media = '';
    modal.querySelector('.story-close').addEventListener('click', () => modal.remove());
    modal.querySelector('[data-story-cancel]').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (event) => { if (event.target === modal) modal.remove(); });
    modal.querySelector('#story-body').addEventListener('input', (event) => { modal.querySelector('#story-body-count').textContent = `${event.target.value.length}/300`; });
    modal.querySelector('#story-image').addEventListener('change', async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      if (file.size > 12 * 1024 * 1024) { modal.querySelector('#story-form-error').textContent = 'A imagem precisa ter até 12 MB.'; event.target.value = ''; return; }
      try {
        media = await resizeStoryImage(file);
        const preview = modal.querySelector('#story-preview');
        preview.innerHTML = `<img src="${media}" alt="Prévia do story"><button type="button" aria-label="Remover imagem">Remover foto</button>`;
        preview.hidden = false;
        preview.querySelector('button').addEventListener('click', () => { media = ''; preview.hidden = true; preview.innerHTML = ''; modal.querySelector('#story-image').value = ''; });
        modal.querySelector('#story-form-error').textContent = '';
      } catch { modal.querySelector('#story-form-error').textContent = 'Não consegui abrir essa imagem. Escolha outra.'; }
    });
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const body = modal.querySelector('#story-body').value.trim();
      const link = modal.querySelector('#story-link').value.trim();
      const music = modal.querySelector('#story-music').value.trim();
      const error = modal.querySelector('#story-form-error');
      if (music && !BX.music.ytId(music)) { error.textContent = 'Cole um link válido do YouTube.'; return; }
      if (!body && !media && !music) { error.textContent = 'Adicione uma foto, uma música ou escreva um texto.'; return; }
      const submit = form.querySelector('[type=submit]');
      submit.disabled = true; submit.textContent = 'Publicando…'; error.textContent = '';
      try {
        await api('stories', { method: 'POST', body: { body, media, link, music, music_start: music ? BX.music.ytStart(music) : 0 } });
        modal.remove();
        await loadStories();
        toast('Story publicado!');
      } catch (e) {
        const msgs = {
          site_closed: 'O site está fechado para novas publicações.',
          invalid_link: 'O link informado é inválido. Use algo como seusite.com ou https://seusite.com — ou deixe o campo vazio.',
          invalid_story_media: 'A imagem é inválida ou muito grande. Escolha outra foto.',
          invalid_music: 'Cole um link válido do YouTube para a música.',
          story_empty: 'Adicione uma foto ou escreva um texto.',
          unauthorized: 'Sua sessão expirou. Entre novamente.',
          network: 'Sem conexão. Verifique sua internet e tente de novo.',
        };
        error.textContent = msgs[e.code] || (e.status === 413 ? 'A foto é grande demais. Escolha uma menor.' : `Não foi possível publicar o story agora. Tente novamente em instantes.${e.detail ? ` [${e.detail}]` : ''}`);
        submit.disabled = false; submit.textContent = 'Publicar story';
      }
    });
    modal.querySelector('#story-body').focus();
  }

  function closeStoryViewer() {
    clearInterval(progressTimer);
    progressTimer = null;
    document.getElementById('story-viewer-modal')?.remove();
  }

  function moveStory(direction) {
    const group = storyGroups[activeGroup];
    if (!group) return closeStoryViewer();
    activeStory += direction;
    if (activeStory >= group.stories.length) { activeGroup += 1; activeStory = 0; }
    if (activeStory < 0) { activeGroup -= 1; activeStory = storyGroups[activeGroup]?.stories.length - 1 || 0; }
    if (activeGroup < 0 || activeGroup >= storyGroups.length) return closeStoryViewer();
    renderCurrentStory();
  }

  async function showStoryViews(story, panel) {
    panel.hidden = false;
    panel.innerHTML = '<div class="story-viewers-loading">Carregando visualizações…</div>';
    try {
      const { viewers = [] } = await api(`stories/${story.id}/views`);
      panel.innerHTML = viewers.length ? `<h3>${viewers.length} ${viewers.length === 1 ? 'visualização' : 'visualizações'}</h3>${viewers.map((person) => `<a class="story-viewer-row" href="${accountPath(person.username)}">${avatar(person, 's32')}<span><b>${esc(person.name)}</b><small>@${esc(person.username)} · ${ago(person.viewed_at)}</small></span></a>`).join('')}` : '<p class="story-viewers-empty">Ainda não há visualizações.</p>';
    } catch { panel.innerHTML = '<p class="story-viewers-empty">Não consegui carregar as visualizações.</p>'; }
  }

  async function renderCurrentStory() {
    clearInterval(progressTimer);
    BX.music.stop();
    const modal = document.getElementById('story-viewer-modal');
    const group = storyGroups[activeGroup];
    const story = group?.stories[activeStory];
    if (!modal || !group || !story) return closeStoryViewer();
    const owner = Number(group.user.id) === Number(state.me.id);
    modal.innerHTML = `
      <section class="story-viewer" role="dialog" aria-modal="true" aria-label="Story de ${esc(group.user.name)}">
        <div class="story-progress-track">${group.stories.map((_, index) => `<span class="story-progress-segment"><i ${index === activeStory ? 'id="story-progress"' : ''} style="width:${index < activeStory ? '100%' : '0%'}"></i></span>`).join('')}</div>
        <header>${avatar(group.user, 's32')}<div><b>${esc(group.user.name)}</b><small>${ago(story.created_at)}</small></div>${owner ? '<button class="story-viewer-action" type="button" data-story-views>◉ Visualizações</button><button class="story-viewer-action danger" type="button" data-story-delete>Excluir</button>' : ''}<button class="story-close" type="button" aria-label="Fechar">×</button></header>
        <div class="story-stage">${story.media ? `<img class="story-media" src="${esc(story.media)}" alt="Foto do story">` : story.body ? '<div class="story-text-only">' + esc(story.body) + '</div>' : `<div class="story-text-only story-music-only">♪ ${esc(story.music_title || 'Música do story')}</div>`}${story.media && story.body ? `<p class="story-caption">${esc(story.body)}</p>` : ''}${story.link ? `<a class="story-link" href="${esc(story.link)}" target="_blank" rel="noopener noreferrer">Abrir link ↗</a>` : ''}<button class="story-nav prev" type="button" aria-label="Story anterior">‹</button><button class="story-nav next" type="button" aria-label="Próximo story">›</button></div>
        ${story.music ? `<div class="story-music">${BX.music.html({ id: story.music, title: story.music_title || 'Música do story', start: story.music_start || 0 }, false)}</div>` : ''}
        ${owner ? `<div class="story-owner-meta"><span>${Number(story.view_count || 0)} visualizações</span><button class="story-view-toggle" type="button" data-story-views>Ver quem assistiu</button></div><div class="story-viewers-panel" hidden></div>` : '<div class="story-reply-hint">Story de 24 horas · <a href="' + accountPath(group.user.username) + '">Ver perfil</a></div>'}
      </section>`;
    const viewsPanel = modal.querySelector('.story-viewers-panel');
    modal.querySelector('.story-close').addEventListener('click', closeStoryViewer);
    modal.querySelector('.prev').addEventListener('click', () => moveStory(-1));
    modal.querySelector('.next').addEventListener('click', () => moveStory(1));
    modal.querySelectorAll('[data-story-views]').forEach((button) => button.addEventListener('click', () => showStoryViews(story, viewsPanel)));
    modal.querySelector('[data-story-delete]')?.addEventListener('click', () => {
      const confirm = document.createElement('div');
      confirm.className = 'story-confirm';
      confirm.innerHTML = '<b>Excluir este story?</b><p>Essa ação não pode ser desfeita.</p><button type="button" class="btn ghost sm" data-cancel>Manter</button><button type="button" class="btn sm" data-confirm>Excluir story</button>';
      modal.querySelector('.story-viewer').appendChild(confirm);
      confirm.querySelector('[data-cancel]').addEventListener('click', () => confirm.remove());
      confirm.querySelector('[data-confirm]').addEventListener('click', async () => {
        const button = confirm.querySelector('[data-confirm]'); button.disabled = true;
        try {
          const ownerId = group.user.id;
          await api(`stories/${story.id}`, { method: 'DELETE' });
          await loadStories();
          const nextGroup = storyGroups.findIndex((item) => Number(item.user.id) === Number(ownerId));
          if (nextGroup < 0) { closeStoryViewer(); toast('Story excluído.'); }
          else { activeGroup = nextGroup; activeStory = Math.min(activeStory, storyGroups[nextGroup].stories.length - 1); renderCurrentStory(); toast('Story excluído.'); }
        } catch { button.disabled = false; toast('Não foi possível excluir esse story.'); }
      });
    });
    if (!owner) api(`stories/${story.id}/view`, { method: 'POST' }).catch(() => {});
    progressStarted = Date.now();
    progressElapsed = 0;
    progressTimer = setInterval(() => {
      const bar = modal.querySelector('#story-progress');
      if (!bar) { clearInterval(progressTimer); return; }
      const elapsed = progressElapsed + Date.now() - progressStarted;
      bar.style.width = `${Math.min(100, elapsed / STORY_MS * 100)}%`;
      if (elapsed >= STORY_MS) moveStory(1);
    }, 60);
  }

  function openStoryGroup(index) {
    activeGroup = index;
    activeStory = 0;
    document.getElementById('story-viewer-modal')?.remove();
    const modal = document.createElement('div');
    modal.id = 'story-viewer-modal';
    modal.className = 'story-modal story-viewer-modal';
    modal.addEventListener('click', (event) => { if (event.target === modal) closeStoryViewer(); });
    document.body.appendChild(modal);
    renderCurrentStory();
  }

  document.addEventListener('keydown', (event) => {
    if (!document.getElementById('story-viewer-modal')) return;
    if (event.key === 'Escape') closeStoryViewer();
    if (event.key === 'ArrowRight') moveStory(1);
    if (event.key === 'ArrowLeft') moveStory(-1);
  });

  v.addEventListener('click', (event) => {
    if (event.target.closest('[data-story-add]')) return openStoryComposer();
    const groupButton = event.target.closest('[data-story-group]');
    if (groupButton) openStoryGroup(Number(groupButton.dataset.storyGroup));
  });

  // Fotos do post: até 4, reduzidas no aparelho antes de enviar.
  const MAX_POST_IMAGES = 4;
  let composerImages = []; // data URIs prontos
  let composerVideo = ''; // data URI do vídeo (máx. 1, ~3 MB)
  const MAX_VIDEO_BYTES = 3 * 1024 * 1024;

  function shrinkPostImage(file) {
    return new Promise((resolve, reject) => {
      const src = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => {
        const scale = Math.min(1, 1280 / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff'; // PNG transparente vira fundo branco no JPEG
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(src);
        let out = '';
        for (const quality of [0.82, 0.7, 0.55, 0.4]) {
          out = canvas.toDataURL('image/jpeg', quality);
          if (out.length < 850000) break;
        }
        resolve(out);
      };
      image.onerror = () => { URL.revokeObjectURL(src); reject(new Error('invalid_image')); };
      image.src = src;
    });
  }

  function renderComposerPreviews() {
    const box = $('#composer-previews');
    if (!box) return;
    box.hidden = !composerImages.length && !composerVideo;
    box.innerHTML = (composerVideo ? `<div class="composer-thumb composer-video"><video src="${esc(composerVideo)}" muted playsinline preload="metadata"></video><button type="button" data-rm-video aria-label="Remover vídeo">✕</button></div>` : '') + composerImages.map((src, i) => `<div class="composer-thumb"><img src="${esc(src)}" alt="" /><button type="button" data-rm-img="${i}" aria-label="Remover foto ${i + 1}">✕</button></div>`).join('');
    const label = $('.composer-photo');
    if (label) label.classList.toggle('disabled', composerImages.length >= MAX_POST_IMAGES || !!composerVideo);
  }

  function setupComposerPhotos(view) {
    composerImages = [];
    composerVideo = '';
    const input = view.querySelector('#composer-files');
    const box = view.querySelector('#composer-previews');
    if (!input || !box) return;
    input.addEventListener('change', async () => {
      let files = [...input.files];
      input.value = '';
      const vid = files.find((f) => /^video\/(mp4|webm|quicktime)$/.test(f.type));
      if (vid) {
        if (composerImages.length || composerVideo || files.length > 1) toast(t('err.invalid_video'));
        else if (vid.size > MAX_VIDEO_BYTES) toast(t('err.video_too_large'));
        else {
          try {
            composerVideo = await new Promise((ok, fail) => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.onerror = fail; r.readAsDataURL(vid); });
          } catch { toast(t('err.invalid_video')); }
          renderComposerPreviews();
        }
        return;
      }
      if (composerVideo) { toast(t('err.invalid_video')); return; }
      const room = MAX_POST_IMAGES - composerImages.length;
      if (files.length > room) toast(t('err.too_many_images'));
      for (const file of files.slice(0, Math.max(0, room))) {
        if (!/^image\/(png|jpeg|webp)$/.test(file.type)) { toast(t('err.invalid_image')); continue; }
        try { composerImages.push(await shrinkPostImage(file)); } catch { toast(t('err.invalid_image')); }
      }
      renderComposerPreviews();
    });
    box.addEventListener('click', (e) => {
      if (e.target.closest('[data-rm-video]')) { composerVideo = ''; renderComposerPreviews(); return; }
      const rm = e.target.closest('[data-rm-img]');
      if (!rm) return;
      composerImages.splice(Number(rm.dataset.rmImg), 1);
      renderComposerPreviews();
    });
  }

  // Prévia da música no compositor: valida o link, mostra o mesmo player global e guarda o ID.
  let composerMusicId = '';
  const titleCache = new Map();
  async function ytTitle(id) {
    if (titleCache.has(id)) return titleCache.get(id);
    let title = '';
    try {
      const r = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`);
      if (r.ok) title = String((await r.json()).title || '').slice(0, 100);
    } catch { /* sem título: usa o texto padrão */ }
    titleCache.set(id, title);
    return title;
  }
  function clearMusicPreview() {
    const box = $('#composer-music-preview'); const msg = $('#composer-music-msg');
    if (box && BX.music) { const pb = box.querySelector('.post-music'); if (pb) BX.music.stop(pb); box.innerHTML = ''; box.hidden = true; }
    if (msg) { msg.hidden = true; msg.textContent = ''; }
    composerMusicId = '';
    const st = $('#composer-music-start'); if (st) { st.hidden = true; st.value = ''; }
  }
  async function updateMusicPreview() {
    const input = $('#composer-music'); const box = $('#composer-music-preview'); const msg = $('#composer-music-msg');
    if (!input || !box || !msg) return;
    const raw = input.value.trim();
    if (!raw) { clearMusicPreview(); return; }
    const id = BX.music.ytId(raw);
    if (!id) {
      clearMusicPreview();
      msg.textContent = t('err.invalid_music'); msg.hidden = false;
      return;
    }
    if (id === composerMusicId) return;
    clearMusicPreview();
    composerMusicId = id;
    const title = await ytTitle(id);
    if (composerMusicId !== id) return; // link mudou enquanto buscava o título
    const st = $('#composer-music-start');
    const start0 = BX.music.ytStart(raw);
    if (st) { st.hidden = false; st.value = start0 ? BX.music.fmtTime(start0) : ''; }
    box.innerHTML = BX.music.html({ id, title: title || 'Prévia da música', start: start0 }, true);
    box.hidden = false;
    BX.music.sync();
  }
  document.addEventListener('input', (e) => { if (e.target && e.target.id === 'composer-music') updateMusicPreview(); });
  // Mudou o ponto de início: atualiza a prévia (e toca a partir de lá se já estiver tocando).
  document.addEventListener('change', (e) => {
    if (!e.target || e.target.id !== 'composer-music-start') return;
    const bar = $('#composer-music-preview .post-music'); if (!bar) return;
    const sec = BX.music.parseTime(e.target.value);
    e.target.value = sec ? BX.music.fmtTime(sec) : '';
    bar.dataset.start = String(sec);
    const ti = bar.querySelector('.pm-title'); if (ti) ti.textContent = ti.textContent.replace(/ · \d+:\d{2}$/, '') + (sec ? ` · ${BX.music.fmtTime(sec)}` : '');
    BX.music.seek(bar, sec);
  });
  document.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('[data-act="musictoggle"]');
    if (b) setTimeout(() => { const i = $('#composer-music'); if (i && i.hidden) clearMusicPreview(); }, 0);
  });

  // Colaboração: até 5 pessoas convidadas. O convite vai pela conversa e o post entra no perfil de quem aceitar.
  const MAX_COLLABS = 5;
  let composerCollabs = []; // [{ username, name, avatar }]
  function renderCollabs() {
    const chips = $('#collab-chips'); const count = $('#collab-count'); const btn = $('.composer-collab-btn');
    if (chips) chips.innerHTML = composerCollabs.map((u, i) => `<span class="collab-chip">${avatar(u)}<span>${esc(u.name)}</span><button type="button" data-rm-collab="${i}" aria-label="Remover ${esc(u.name)}">✕</button></span>`).join('');
    if (count) { count.hidden = !composerCollabs.length; count.textContent = String(composerCollabs.length); }
    if (btn) btn.classList.toggle('has-collab', composerCollabs.length > 0);
    const input = $('#collab-input'); if (input) input.disabled = composerCollabs.length >= MAX_COLLABS;
  }
  function resetCollabs() {
    composerCollabs = [];
    const panel = $('#composer-collab'); const input = $('#collab-input'); const box = $('#collab-suggest');
    if (panel) panel.hidden = true;
    if (input) input.value = '';
    if (box) { box.hidden = true; box.innerHTML = ''; }
    renderCollabs();
  }
  let collabSeq = 0; let collabFound = [];
  const collabSearch = BX.debounce(async () => {
    const input = $('#collab-input'); const box = $('#collab-suggest'); if (!input || !box) return;
    const term = input.value.trim().replace(/^@/, '');
    const my = ++collabSeq;
    if (!term) { box.hidden = true; box.innerHTML = ''; return; }
    try {
      const { users } = await api(`search?q=${encodeURIComponent(term)}`);
      if (my !== collabSeq) return;
      collabFound = (users || []).filter((u) => u.id !== state.me.id && !composerCollabs.some((c) => c.username === u.username)).slice(0, 5);
      box.innerHTML = collabFound.length
        ? collabFound.map((u, i) => `<button type="button" class="collab-opt" data-add-collab="${i}">${avatar(u, 's32')}<span><b>${esc(u.name)}</b><small>@${esc(u.username)}</small></span></button>`).join('')
        : '<div class="collab-none">Ninguém encontrado.</div>';
      box.hidden = false;
    } catch { box.hidden = true; }
  }, 250);
  function addCollab(u) {
    if (!u) return;
    if (composerCollabs.length >= MAX_COLLABS) return toast(t('err.too_many_collabs'));
    if (composerCollabs.some((c) => c.username === u.username)) return;
    composerCollabs.push({ username: u.username, name: u.name, avatar: u.avatar });
    const input = $('#collab-input'); const box = $('#collab-suggest');
    if (input) { input.value = ''; input.focus(); }
    if (box) { box.hidden = true; box.innerHTML = ''; }
    renderCollabs();
  }
  BX.actions.collabtoggle = () => {
    const panel = $('#composer-collab'); if (!panel) return;
    panel.hidden = !panel.hidden;
    if (!panel.hidden) setTimeout(() => $('#collab-input')?.focus(), 30);
  };
  document.addEventListener('input', (e) => { if (e.target && e.target.id === 'collab-input') collabSearch(); });
  document.addEventListener('keydown', (e) => {
    if (!e.target || e.target.id !== 'collab-input') return;
    if (e.key === 'Enter') { e.preventDefault(); addCollab(collabFound[0]); }
    if (e.key === 'Escape') { const box = $('#collab-suggest'); if (box) box.hidden = true; }
  });
  document.addEventListener('click', (e) => {
    const add = e.target.closest && e.target.closest('[data-add-collab]');
    if (add) return addCollab(collabFound[Number(add.dataset.addCollab)]);
    const rm = e.target.closest && e.target.closest('[data-rm-collab]');
    if (rm) { composerCollabs.splice(Number(rm.dataset.rmCollab), 1); renderCollabs(); }
  });

  forms.post = async (form) => {
    const textarea = form.body;
    const body = textarea.value.trim();
    const musicInput = $('#composer-music');
    const music = musicInput ? musicInput.value.trim() : '';
    if (music && !BX.music.ytId(music)) return toast(t('err.invalid_music'));
    if (!body && !composerImages.length && !composerVideo && !music) return toast(t('err.post_empty'));
    const button = $('button[type=submit]', form);
    button.disabled = true;
    try {
      const { post } = await api('posts', { method: 'POST', body: { body, images: composerImages, video: composerVideo || undefined, music: music || undefined, music_start: music ? BX.music.parseTime(($('#composer-music-start') || {}).value) : undefined, collaborators: composerCollabs.length ? composerCollabs.map((c) => c.username) : undefined } });
      const invited = composerCollabs.length;
      resetCollabs();
      if (invited) toast(invited === 1 ? 'Convite enviado pela conversa.' : `${invited} convites enviados pela conversa.`);
      if (musicInput) { musicInput.value = ''; musicInput.hidden = true; clearMusicPreview(); }
      textarea.value = '';
      composerImages = [];
      composerVideo = '';
      renderComposerPreviews();
      $('.counter', form).textContent = '500';
      const list = $('#posts');
      if (list) {
        $('.empty', list)?.remove();
        list.insertAdjacentHTML('afterbegin', postHTML(post));
      }
    } catch (e) { toast(errMsg(e)); }
    button.disabled = false;
  };

  homeView(v);
})();
