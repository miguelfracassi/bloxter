(() => {
  'use strict';
  // Se o site já foi inaugurado, leva a pessoa para a página inicial.
  async function initialize() {
    try {
      const res = await fetch('/api/site/status', { credentials: 'same-origin' });
      const status = await res.json().catch(() => ({}));
      if (res.ok && status.access_open) location.replace('/');
    } catch { /* sem API: mantém a tela de espera */ }
  }
  initialize();
})();
