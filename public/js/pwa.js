(() => {
  // Logo quebrada (arquivo faltando ou cache antigo): tenta alternativas antes de mostrar o texto.
  const chain = ['/symbol.png', '/icon.png', '/logo.png'];
  window.addEventListener('error', (ev) => {
    const img = ev.target;
    if (!img || img.tagName !== 'IMG') return;
    const cur = (img.getAttribute('src') || '').split('?')[0];
    const i = chain.indexOf(cur);
    if (i === -1) return;
    if (i + 1 < chain.length) img.src = chain[i + 1] + '?v=2';
    else { img.style.visibility = 'hidden'; img.removeAttribute('alt'); }
  }, true);
})();
/* Bloxter — aplicativo (PWA).
   - registra o service worker (/sw.js)
   - controla a instalação (botão nativo no Android/computador, passo a passo no iPhone)
   - mostra o convite "Instale o Bloxter" na primeira visita
   Carregado de forma síncrona no <head> de cada página para não perder o evento de instalação.
   Disponível para as outras páginas em window.BXPWA. */
(() => {
  'use strict';
  if (window.BXPWA) return;

  const APP_VERSION = '1.0.0';
  const KEY = 'bx_pwa_prompt'; // 'dismissed' | 'installed'

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* ignore */ } },
  };

  /* ---------- Ambiente ---------- */
  const ua = navigator.userAgent || '';
  const isIOS = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /android/i.test(ua);
  const platform = isIOS ? 'ios' : isAndroid ? 'android' : 'desktop';
  const isStandalone = () => {
    try {
      return ['standalone', 'minimal-ui', 'fullscreen'].some((m) => matchMedia(`(display-mode: ${m})`).matches) || navigator.standalone === true;
    } catch { return false; }
  };
  const lang = () => {
    const l = store.get('bx_lang');
    if (l === 'pt' || l === 'en') return l;
    return (navigator.language || 'pt').toLowerCase().startsWith('pt') ? 'pt' : 'en';
  };

  /* ---------- Textos ---------- */
  const TXT = {
    pt: {
      title: 'Instale o Bloxter',
      text: 'Use o Bloxter como aplicativo, direto da tela inicial.',
      f1: 'Ícone na tela inicial e na lista de apps',
      f2: 'Abre em tela cheia, sem barra do navegador',
      f3: 'Carrega mais rápido, até com conexão fraca',
      install: 'Instalar app',
      later: 'Agora não',
      howto: 'Como instalar',
      learn: 'Saiba mais',
      gotit: 'Entendi',
      close: 'Fechar',
      ios1: 'Toque em Compartilhar',
      ios2: 'Escolha “Adicionar à Tela de Início”',
      ios3: 'Toque em Adicionar',
      iosNote: 'No iPhone, abra pelo Safari.',
    },
    en: {
      title: 'Install Bloxter',
      text: 'Use Bloxter as an app, right from your home screen.',
      f1: 'Icon on your home screen and app list',
      f2: 'Opens full screen, no browser bar',
      f3: 'Loads faster, even on a weak connection',
      install: 'Install app',
      later: 'Not now',
      howto: 'How to install',
      learn: 'Learn more',
      gotit: 'Got it',
      close: 'Close',
      ios1: 'Tap Share',
      ios2: 'Choose “Add to Home Screen”',
      ios3: 'Tap Add',
      iosNote: 'On iPhone, open this page in Safari.',
    },
  };
  const t = (k) => (TXT[lang()] || TXT.pt)[k] || k;

  /* ---------- Ícones (SVG, traço, herdam a cor) ---------- */
  const svg = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const ICONS = {
    close: svg('<path d="M6 6l12 12M18 6 6 18"/>'),
    phone: svg('<rect x="7" y="2" width="10" height="20" rx="2.5"/><path d="M11 18h2"/>'),
    expand: svg('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'),
    zap: svg('<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>'),
    share: svg('<path d="M12 3v12"/><path d="M8 7l4-4 4 4"/><path d="M5 11v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8"/>'),
    plus: svg('<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M12 8v8M8 12h8"/>'),
    download: svg('<path d="M12 3v12"/><path d="M7 11l5 5 5-5"/><path d="M5 21h14"/>'),
    check: svg('<path d="M5 12l5 5 9-10"/>'),
    refresh: svg('<path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 4v5h-5"/>'),
    trash: svg('<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6l1 14h10l1-14"/>'),
    wifi: svg('<path d="M2 8.8a15 15 0 0 1 20 0"/><path d="M5.5 12.4a10 10 0 0 1 13 0"/><path d="M9 16a5 5 0 0 1 6 0"/><path d="M12 19.5h.01"/>'),
  };

  /* ---------- Instalação ---------- */
  let deferred = null;
  const listeners = new Set();
  const emit = () => listeners.forEach((fn) => { try { fn(); } catch { /* ignore */ } });

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferred = event;
    emit();
    renderSheetActions();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    store.set(KEY, 'installed');
    closeSheet();
    emit();
  });
  try {
    matchMedia('(display-mode: standalone)').addEventListener('change', emit);
  } catch { /* ignore */ }

  async function install() {
    if (!deferred) return 'unavailable';
    const event = deferred;
    deferred = null;
    try {
      event.prompt();
      const choice = await event.userChoice;
      if (choice.outcome === 'accepted') store.set(KEY, 'installed');
      emit();
      return choice.outcome;
    } catch {
      emit();
      return 'error';
    }
  }

  /* ---------- Service worker ---------- */
  let regPromise = null;
  function register() {
    if (!('serviceWorker' in navigator) || regPromise) return;
    regPromise = navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => null);
    regPromise.then(emit);
  }
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register);

  async function getReg() {
    if (!('serviceWorker' in navigator)) return null;
    try { return (await regPromise) || (await navigator.serviceWorker.getRegistration()) || null; } catch { return null; }
  }
  async function swState() {
    const supported = 'serviceWorker' in navigator;
    if (!supported) return { supported: false, active: false, controlled: false };
    const reg = await getReg();
    return { supported: true, active: !!(reg && reg.active), controlled: !!navigator.serviceWorker.controller };
  }
  async function checkUpdate() {
    const reg = await getReg();
    if (!reg) return 'unsupported';
    try {
      await reg.update();
      return reg.installing || reg.waiting ? 'updated' : 'latest';
    } catch { return 'error'; }
  }
  async function clearCache() {
    if (!('caches' in window)) return 0;
    const keys = (await caches.keys()).filter((k) => k.startsWith('bloxter-'));
    await Promise.all(keys.map((k) => caches.delete(k)));
    return keys.length;
  }

  /* ---------- Convite da primeira visita ---------- */
  const SKIP = /^\/(administracao|team|verificacao|gerenciador|maintenance|developers|oauth|oculto|app|offline|blog)/;
  let sheet = null;

  function injectStyle() {
    if (document.getElementById('bx-pwa-style')) return;
    const style = document.createElement('style');
    style.id = 'bx-pwa-style';
    style.textContent = `
      .bxp{position:fixed;z-index:999;left:0;right:0;bottom:0;display:flex;justify-content:center;padding:0 12px calc(12px + env(safe-area-inset-bottom,0px));pointer-events:none}
      .bxp-card{pointer-events:auto;width:min(100%,440px);background:var(--bg,#000);color:var(--fg,#fff);border:1px solid var(--line,#222);border-radius:20px;padding:18px;box-shadow:0 18px 60px #0009;animation:bxp-in .35s cubic-bezier(.2,.8,.2,1)}
      .bxp-head{display:flex;align-items:center;gap:13px}
      .bxp-head img{width:50px;height:50px;border-radius:13px;flex:none;border:1px solid var(--line,#222)}
      .bxp-head div{flex:1;min-width:0}
      .bxp-head h2{font-size:16px;font-weight:600;line-height:1.25;margin:0}
      .bxp-head p{font-size:13px;color:var(--fg2,#9a9a9a);line-height:1.4;margin:2px 0 0}
      .bxp-x{flex:none;align-self:flex-start;width:34px;height:34px;display:grid;place-items:center;border:0;border-radius:50%;background:transparent;color:var(--fg2,#9a9a9a);cursor:pointer}
      .bxp-x:hover{background:var(--hover,#0e0e0e);color:var(--fg,#fff)}
      .bxp-x svg,.bxp-list svg,.bxp-steps svg{width:18px;height:18px}
      .bxp-list,.bxp-steps{list-style:none;display:grid;gap:9px;margin:15px 0 0;padding:0}
      .bxp-list li,.bxp-steps li{display:flex;align-items:center;gap:11px;font-size:13px;line-height:1.35}
      .bxp-list svg,.bxp-steps svg{flex:none;color:var(--fg,#fff)}
      .bxp-steps{padding:12px;border:1px solid var(--line,#222);border-radius:14px;background:var(--card,#0a0a0a)}
      .bxp-note{font-size:12px;color:var(--fg2,#9a9a9a);margin:10px 0 0}
      .bxp-actions{display:flex;gap:9px;margin-top:16px}
      .bxp-actions>*{flex:1;text-align:center;justify-content:center}
      .bxp-btn{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 18px;border-radius:999px;border:1px solid var(--btn-bg,#fff);background:var(--btn-bg,#fff);color:var(--btn-fg,#000);font:600 14px/1 inherit;font-family:inherit;cursor:pointer;text-decoration:none}
      .bxp-btn svg{width:17px;height:17px}
      .bxp-btn.ghost{background:transparent;color:var(--fg,#fff);border-color:var(--line,#222)}
      .bxp-btn.ghost:hover{background:var(--hover,#0e0e0e)}
      .bxp-btn:hover{text-decoration:none}
      @keyframes bxp-in{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:none}}
      @media(min-width:900px){.bxp{justify-content:flex-end;padding:0 24px 24px}}
      @media(prefers-reduced-motion:reduce){.bxp-card{animation:none}}
    `;
    document.head.appendChild(style);
  }

  function actionsHTML() {
    if (platform === 'ios') {
      return `<div class="bxp-actions"><a class="bxp-btn ghost" href="/app#instalar" data-bxp="learn">${t('learn')}</a><button class="bxp-btn" type="button" data-bxp="later">${t('gotit')}</button></div>`;
    }
    if (deferred) {
      return `<div class="bxp-actions"><button class="bxp-btn ghost" type="button" data-bxp="later">${t('later')}</button><button class="bxp-btn" type="button" data-bxp="install">${ICONS.download}${t('install')}</button></div>`;
    }
    return `<div class="bxp-actions"><button class="bxp-btn ghost" type="button" data-bxp="later">${t('later')}</button><a class="bxp-btn" href="/app#instalar" data-bxp="learn">${t('howto')}</a></div>`;
  }

  function renderSheetActions() {
    if (!sheet) return;
    const box = sheet.querySelector('[data-bxp-actions]');
    if (box) box.innerHTML = actionsHTML();
  }

  function dismiss() {
    store.set(KEY, 'dismissed');
    closeSheet();
  }
  function closeSheet() {
    if (!sheet) return;
    document.removeEventListener('keydown', onKey);
    sheet.remove();
    sheet = null;
  }
  function onKey(event) { if (event.key === 'Escape') dismiss(); }

  function openSheet() {
    if (sheet || !document.body) return;
    injectStyle();
    sheet = document.createElement('div');
    sheet.className = 'bxp';
    sheet.id = 'bx-pwa-sheet';
    const body = platform === 'ios'
      ? `<ol class="bxp-steps"><li>${ICONS.share}<span>${t('ios1')}</span></li><li>${ICONS.plus}<span>${t('ios2')}</span></li><li>${ICONS.check}<span>${t('ios3')}</span></li></ol><p class="bxp-note">${t('iosNote')}</p>`
      : `<ul class="bxp-list"><li>${ICONS.phone}<span>${t('f1')}</span></li><li>${ICONS.expand}<span>${t('f2')}</span></li><li>${ICONS.zap}<span>${t('f3')}</span></li></ul>`;
    sheet.innerHTML = `
      <section class="bxp-card" role="dialog" aria-modal="false" aria-labelledby="bxp-title">
        <div class="bxp-head">
          <img src="/icon-192.png?v=202610287732" alt="" width="50" height="50" />
          <div><h2 id="bxp-title">${t('title')}</h2><p>${t('text')}</p></div>
          <button class="bxp-x" type="button" data-bxp="later" aria-label="${t('close')}">${ICONS.close}</button>
        </div>
        ${body}
        <div data-bxp-actions>${actionsHTML()}</div>
      </section>`;
    sheet.addEventListener('click', async (event) => {
      const el = event.target.closest('[data-bxp]');
      if (!el) return;
      const act = el.dataset.bxp;
      if (act === 'later') dismiss();
      else if (act === 'learn') store.set(KEY, 'dismissed');
      else if (act === 'install') {
        el.disabled = true;
        const outcome = await install();
        if (outcome === 'accepted') closeSheet();
        else if (outcome === 'dismissed') dismiss();
        else renderSheetActions();
      }
    });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(sheet);
  }

  const eligible = () => !isStandalone() && !store.get(KEY) && !SKIP.test(location.pathname);
  function maybeShow(tries = 0) {
    if (!eligible()) return;
    // Espera o formulário de personalização inicial terminar, para não empilhar janelas.
    if (document.getElementById('bx-profile-details') || document.getElementById('bx-onboarding')) {
      if (tries < 20) setTimeout(() => maybeShow(tries + 1), 1500);
      return;
    }
    openSheet();
  }
  const schedule = () => setTimeout(maybeShow, 2200);
  if (document.readyState === 'complete') schedule();
  else window.addEventListener('load', schedule);

  window.BXPWA = {
    version: APP_VERSION,
    platform,
    lang,
    t,
    ICONS,
    isStandalone,
    canPrompt: () => !!deferred,
    install,
    swState,
    checkUpdate,
    clearCache,
    onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    openSheet,
  };
})();
