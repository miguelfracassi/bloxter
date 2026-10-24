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
      <div class="page-head"><h1>${t('nav.home')}</h1></div>
      <section class="stories-panel" aria-label="Stories">
        <div class="stories-heading"><div><h2>Stories</h2><p>Compartilhe um momento; ele desaparece em 24 horas.</p></div><button class="btn ghost sm" type="button" data-story-add>+ Criar story</button></div>
        <div class="story-strip" id="story-strip" aria-live="polite"><div class="story-loading">Carregando stories…</div></div>
      </section>
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
    await loadStories();
  }

  async function loadStories() {
    const strip = $('#story-strip');
    if (!strip) return;
    try {
      const { stories = [] } = await api('stories');
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
        <button class="story-item story-own" type="button" data-story-add aria-label="Criar story">
          <span class="story-avatar-wrap ${ownCount ? (ownViewed ? 'seen' : 'unseen') : 'empty'}">${avatar(state.me, 's64')}<i aria-hidden="true">+</i></span>
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
      strip.innerHTML = `<div class="story-empty">Não foi possível carregar stories. <button type="button" class="story-retry" id="story-retry">Tentar de novo</button></div>`;
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
        resolve(canvas.toDataURL('image/jpeg', 0.82));
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
          <label for="story-body">Texto</label><textarea id="story-body" maxlength="300" placeholder="O que você quer compartilhar?"></textarea>
          <div class="story-compose-counter"><span>Opcional</span><span id="story-body-count">0/300</span></div>
          <label for="story-link">Link (opcional)</label><input id="story-link" type="url" maxlength="200" placeholder="https://…" inputmode="url">
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
      const error = modal.querySelector('#story-form-error');
      if (!body && !media) { error.textContent = 'Adicione uma foto ou escreva um texto.'; return; }
      const submit = form.querySelector('[type=submit]');
      submit.disabled = true; submit.textContent = 'Publicando…'; error.textContent = '';
      try {
        await api('stories', { method: 'POST', body: { body, media, link } });
        modal.remove();
        await loadStories();
        toast('Story publicado!');
      } catch (e) {
        error.textContent = e.code === 'site_closed' ? 'O site está fechado para novas publicações.' : 'Não foi possível publicar. Confira o link e tente novamente.';
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
    const modal = document.getElementById('story-viewer-modal');
    const group = storyGroups[activeGroup];
    const story = group?.stories[activeStory];
    if (!modal || !group || !story) return closeStoryViewer();
    const owner = Number(group.user.id) === Number(state.me.id);
    modal.innerHTML = `
      <section class="story-viewer" role="dialog" aria-modal="true" aria-label="Story de ${esc(group.user.name)}">
        <div class="story-progress-track">${group.stories.map((_, index) => `<span class="story-progress-segment"><i ${index === activeStory ? 'id="story-progress"' : ''} style="width:${index < activeStory ? '100%' : '0%'}"></i></span>`).join('')}</div>
        <header>${avatar(group.user, 's32')}<div><b>${esc(group.user.name)}</b><small>${ago(story.created_at)}</small></div>${owner ? '<button class="story-viewer-action" type="button" data-story-views>◉ Visualizações</button><button class="story-viewer-action danger" type="button" data-story-delete>Excluir</button>' : ''}<button class="story-close" type="button" aria-label="Fechar">×</button></header>
        <div class="story-stage">${story.media ? `<img class="story-media" src="${esc(story.media)}" alt="Foto do story">` : '<div class="story-text-only">' + esc(story.body) + '</div>'}${story.media && story.body ? `<p class="story-caption">${esc(story.body)}</p>` : ''}${story.link ? `<a class="story-link" href="${esc(story.link)}" target="_blank" rel="noopener noreferrer">Abrir link ↗</a>` : ''}<button class="story-nav prev" type="button" aria-label="Story anterior">‹</button><button class="story-nav next" type="button" aria-label="Próximo story">›</button></div>
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

  forms.post = async (form) => {
    const textarea = form.body;
    const body = textarea.value.trim();
    if (!body) return toast(t('err.post_empty'));
    const button = $('button[type=submit]', form);
    button.disabled = true;
    try {
      const { post } = await api('posts', { method: 'POST', body: { body } });
      textarea.value = '';
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
