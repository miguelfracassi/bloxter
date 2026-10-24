/* /app — informações do aplicativo do Bloxter (instalar, status, offline, atualização). */
(async () => {
  const { $, esc, state, api, toast, setTitle } = window.BX;
  const P = window.BXPWA;

  // Quem está logado vê o menu do Bloxter; visitante vê o topo simples.
  let logged = false;
  try { await api('me'); logged = true; } catch { /* visitante */ }
  const v = await BX.init({ auth: 'any', shell: logged ? 'app' : 'public', active: 'settings' });
  if (!v) return;

  const L = P ? P.lang() : 'pt';
  const TX = {
    pt: {
      title: 'Aplicativo', sub: 'Bloxter no seu celular ou computador',
      tagline: 'A rede social feita para quem vive o roleplay.',
      installed: 'Instalado', notInstalled: 'Não instalado',
      install: 'Instalar app', usingApp: 'Você já está usando o aplicativo', howto: 'Veja como instalar',
      info: 'Informações do aplicativo',
      name: 'Nome', version: 'Versão', status: 'Status', mode: 'Modo de abertura', device: 'Dispositivo',
      offline: 'Modo offline', connection: 'Conexão', address: 'Endereço', direct: 'Instalação direta',
      modeApp: 'Aplicativo (tela cheia)', modeBrowser: 'Navegador',
      devAndroid: 'Android', devIos: 'iPhone / iPad', devDesktop: 'Computador',
      offOn: 'Ativo', offWait: 'Ativa após recarregar a página', offNo: 'Indisponível neste navegador',
      online: 'Online', offlineNow: 'Sem conexão',
      directYes: 'Disponível neste navegador', directNo: 'Use o passo a passo abaixo',
      perks: 'Vantagens',
      p1: 'Ícone na tela inicial e na lista de aplicativos do aparelho',
      p2: 'Abre em tela cheia, sem a barra do navegador',
      p3: 'Carrega mais rápido e mostra uma tela própria quando a internet cai',
      p4: 'Atualiza sozinho: você sempre usa a versão mais nova',
      howtoTitle: 'Como instalar',
      android: 'Android', ios: 'iPhone', desktop: 'Computador',
      steps: {
        android: ['Abra o Bloxter no Chrome.', 'Toque no menu (três pontinhos) no canto superior.', 'Toque em “Instalar app” ou “Adicionar à tela inicial”.', 'Confirme em “Instalar”. O Bloxter aparece na tela inicial e em Configurações › Apps.'],
        ios: ['Abra o Bloxter no Safari.', 'Toque no botão Compartilhar, na barra inferior.', 'Role e toque em “Adicionar à Tela de Início”.', 'Toque em “Adicionar”. O ícone do Bloxter aparece na tela inicial.'],
        desktop: ['Abra o Bloxter no Chrome ou no Edge.', 'Clique no ícone de instalar, no fim da barra de endereço (ou menu › “Instalar Bloxter”).', 'Confirme em “Instalar”. O Bloxter abre em uma janela própria.', 'No Safari do Mac: menu Arquivo › “Adicionar ao Dock”.'],
      },
      uninstall: 'Para desinstalar: no Android e no iPhone, segure o ícone do Bloxter e escolha remover; no computador, use o menu da janela do app › “Desinstalar Bloxter”.',
      maint: 'Manutenção do app',
      upd: 'Verificar atualização', updText: 'Procura uma versão nova do aplicativo.', updBtn: 'Verificar',
      updLatest: 'Você já está na versão mais recente.', updNew: 'Atualização encontrada. Ela vale na próxima abertura.', updErr: 'Não foi possível verificar agora.', updNone: 'Atualizações automáticas não são suportadas aqui.',
      clear: 'Limpar dados offline', clearText: 'Apaga só os arquivos salvos para uso offline. Sua conta e suas mensagens não são afetadas.', clearBtn: 'Limpar',
      cleared: 'Dados offline limpos.', clearedNone: 'Não havia dados offline para limpar.',
      installedOk: 'Instalando o Bloxter…', installCanceled: 'Instalação cancelada.',
      back: 'Voltar às configurações',
    },
    en: {
      title: 'App', sub: 'Bloxter on your phone or computer',
      tagline: 'The social network made for those who live roleplay.',
      installed: 'Installed', notInstalled: 'Not installed',
      install: 'Install app', usingApp: 'You are already using the app', howto: 'See how to install',
      info: 'App information',
      name: 'Name', version: 'Version', status: 'Status', mode: 'Display mode', device: 'Device',
      offline: 'Offline mode', connection: 'Connection', address: 'Address', direct: 'Direct install',
      modeApp: 'App (full screen)', modeBrowser: 'Browser',
      devAndroid: 'Android', devIos: 'iPhone / iPad', devDesktop: 'Computer',
      offOn: 'Active', offWait: 'Active after reloading the page', offNo: 'Not available in this browser',
      online: 'Online', offlineNow: 'Offline',
      directYes: 'Available in this browser', directNo: 'Use the steps below',
      perks: 'Perks',
      p1: 'Icon on your home screen and in your device’s app list',
      p2: 'Opens full screen, without the browser bar',
      p3: 'Loads faster and shows its own screen when the internet drops',
      p4: 'Updates itself: you always use the newest version',
      howtoTitle: 'How to install',
      android: 'Android', ios: 'iPhone', desktop: 'Computer',
      steps: {
        android: ['Open Bloxter in Chrome.', 'Tap the menu (three dots) at the top.', 'Tap “Install app” or “Add to Home screen”.', 'Confirm with “Install”. Bloxter shows up on your home screen and in Settings › Apps.'],
        ios: ['Open Bloxter in Safari.', 'Tap the Share button on the bottom bar.', 'Scroll and tap “Add to Home Screen”.', 'Tap “Add”. The Bloxter icon appears on your home screen.'],
        desktop: ['Open Bloxter in Chrome or Edge.', 'Click the install icon at the end of the address bar (or menu › “Install Bloxter”).', 'Confirm with “Install”. Bloxter opens in its own window.', 'In Safari on Mac: File menu › “Add to Dock”.'],
      },
      uninstall: 'To uninstall: on Android and iPhone, press and hold the Bloxter icon and choose remove; on a computer, use the app window menu › “Uninstall Bloxter”.',
      maint: 'App maintenance',
      upd: 'Check for updates', updText: 'Looks for a new version of the app.', updBtn: 'Check',
      updLatest: 'You already have the latest version.', updNew: 'Update found. It applies the next time you open the app.', updErr: 'Could not check right now.', updNone: 'Automatic updates are not supported here.',
      clear: 'Clear offline data', clearText: 'Only deletes files saved for offline use. Your account and messages are not affected.', clearBtn: 'Clear',
      cleared: 'Offline data cleared.', clearedNone: 'There was no offline data to clear.',
      installedOk: 'Installing Bloxter…', installCanceled: 'Installation canceled.',
      back: 'Back to settings',
    },
  };
  const T = TX[L] || TX.pt;
  const I = (P && P.ICONS) || {};
  const platform = P ? P.platform : 'desktop';
  let tab = platform === 'ios' ? 'ios' : platform === 'android' ? 'android' : 'desktop';

  setTitle(`${T.title} · Bloxter`);
  v.innerHTML = `
    <div class="page-head"><h1>${T.title}</h1><small>${T.sub}</small></div>
    <section class="settings app-page">
      <div class="app-hero">
        <img class="app-hero-icon" src="/icon-192.png" alt="" width="64" height="64" />
        <div class="app-hero-copy"><h2>Bloxter</h2><p>${T.tagline}</p><span class="app-pill" id="app-status"></span></div>
      </div>
      <div class="app-cta" id="app-cta"></div>

      <h3>${T.info}</h3>
      <dl class="app-info" id="app-info"></dl>

      <h3>${T.perks}</h3>
      <ul class="app-perks">
        <li>${I.phone || ''}<span>${T.p1}</span></li>
        <li>${I.expand || ''}<span>${T.p2}</span></li>
        <li>${I.zap || ''}<span>${T.p3}</span></li>
        <li>${I.refresh || ''}<span>${T.p4}</span></li>
      </ul>

      <h3 id="instalar">${T.howtoTitle}</h3>
      <div class="pill-toggle app-seg" role="tablist" aria-label="${T.howtoTitle}">
        ${['android', 'ios', 'desktop'].map((k) => `<button type="button" role="tab" data-tab="${k}">${T[k]}</button>`).join('')}
      </div>
      <ol class="app-steps" id="app-steps"></ol>
      <p class="hint app-uninstall">${T.uninstall}</p>

      <h3>${T.maint}</h3>
      <div class="setting-card"><div class="setting-card-copy"><b>${T.upd}</b><span>${T.updText}</span></div><button class="btn ghost" type="button" id="app-update">${T.updBtn}</button></div>
      <div class="setting-card"><div class="setting-card-copy"><b>${T.clear}</b><span>${T.clearText}</span></div><button class="btn ghost" type="button" id="app-clear">${T.clearBtn}</button></div>
      ${logged ? `<p class="app-back"><a href="/settings#app">${T.back}</a></p>` : ''}
    </section>`;

  const standalone = () => (P ? P.isStandalone() : false);
  const canPrompt = () => (P ? P.canPrompt() : false);

  function renderCta() {
    const cta = $('#app-cta', v);
    const pill = $('#app-status', v);
    const on = standalone();
    pill.textContent = on ? T.installed : T.notInstalled;
    pill.classList.toggle('on', on);
    if (on) cta.innerHTML = `<div class="app-done">${I.check || ''}<span>${T.usingApp}</span></div>`;
    else if (canPrompt()) cta.innerHTML = `<button class="btn lg block" type="button" id="app-install">${T.install}</button>`;
    else cta.innerHTML = `<a class="btn lg block" href="#instalar">${T.howto}</a>`;
    const btn = $('#app-install', v);
    if (btn) btn.addEventListener('click', async () => {
      btn.disabled = true;
      const outcome = await P.install();
      if (outcome === 'accepted') toast(T.installedOk);
      else if (outcome === 'dismissed') toast(T.installCanceled);
      renderCta();
    });
  }

  async function renderInfo() {
    const sw = P ? await P.swState() : { supported: false };
    const offline = !sw.supported ? T.offNo : sw.active && sw.controlled ? T.offOn : sw.active ? T.offWait : T.offWait;
    const device = { android: T.devAndroid, ios: T.devIos, desktop: T.devDesktop }[platform];
    const rows = [
      [T.name, 'Bloxter'],
      [T.version, P ? P.version : '1.0.0'],
      [T.status, standalone() ? T.installed : T.notInstalled],
      [T.mode, standalone() ? T.modeApp : T.modeBrowser],
      [T.device, device],
      [T.offline, offline],
      [T.connection, navigator.onLine ? T.online : T.offlineNow],
      [T.address, location.host],
    ];
    if (!standalone()) rows.push([T.direct, canPrompt() ? T.directYes : T.directNo]);
    $('#app-info', v).innerHTML = rows.map(([k, val]) => `<div><dt>${esc(k)}</dt><dd>${esc(val)}</dd></div>`).join('');
  }

  function renderSteps() {
    $('#app-steps', v).innerHTML = T.steps[tab].map((s) => `<li>${esc(s)}</li>`).join('');
    v.querySelectorAll('.app-seg [data-tab]').forEach((b) => {
      const on = b.dataset.tab === tab;
      b.classList.toggle('on', on);
      b.setAttribute('aria-selected', String(on));
    });
  }

  v.querySelectorAll('.app-seg [data-tab]').forEach((b) => b.addEventListener('click', () => { tab = b.dataset.tab; renderSteps(); }));

  $('#app-update', v).addEventListener('click', async (event) => {
    const btn = event.currentTarget;
    btn.disabled = true;
    const result = P ? await P.checkUpdate() : 'unsupported';
    toast({ latest: T.updLatest, updated: T.updNew, error: T.updErr, unsupported: T.updNone }[result] || T.updErr);
    btn.disabled = false;
    renderInfo();
  });
  $('#app-clear', v).addEventListener('click', async (event) => {
    const btn = event.currentTarget;
    btn.disabled = true;
    const n = P ? await P.clearCache() : 0;
    toast(n ? T.cleared : T.clearedNone);
    btn.disabled = false;
  });

  const refresh = () => { renderCta(); renderInfo(); };
  refresh();
  renderSteps();
  if (P) P.onChange(refresh);
  window.addEventListener('online', renderInfo);
  window.addEventListener('offline', renderInfo);
  if (navigator.serviceWorker) navigator.serviceWorker.addEventListener('controllerchange', renderInfo);

  // Abre direto na seção quando vem de /app#instalar.
  if (location.hash === '#instalar') setTimeout(() => document.getElementById('instalar')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
})();
