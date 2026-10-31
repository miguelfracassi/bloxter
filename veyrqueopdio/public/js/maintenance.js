(async () => {
  const set = (id, value) => { const element = document.getElementById(id); if (element) element.textContent = value; };
  try { const response = await fetch('/api/site/status', { cache: 'no-store' }); const data = await response.json(); const m = data.maintenance || {};
    if (!m.enabled) { location.replace(data.access_open ? '/home' : '/acess'); return; }
    set('maintenance-responsible', m.responsible || 'Equipe Bloxter');
    set('maintenance-reason', m.reason || 'Atualizações');
    set('maintenance-updates', m.updates || 'Estamos trabalhando para melhorar sua experiência.');
  } catch (_) {}
})();
