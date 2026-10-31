/* /discord — a comunidade do Bloxter no Discord. */
(async () => {
  const { esc, api, setTitle, state, ICON } = window.BX;
  const LINK = 'https://discord.gg/zNuVMm73w5';

  // Quem está logado vê o menu do Bloxter; visitante vê o topo simples.
  let logged = false;
  try { logged = !!(await api('me')).user; } catch { /* visitante */ }
  const v = await BX.init({ auth: 'any', shell: logged ? 'app' : 'public', active: 'settings' });
  if (!v) return;
  // A página do Discord só abre depois que a administração libera o recurso.
  if (!state.features.discord) { window.BX.go(logged ? '/home' : '/', true); return; }

  const pt = state.lang !== 'en';
  const T = pt ? {
    title: 'Discord', sub: 'A comunidade do Bloxter ao vivo',
    tagline: 'Converse com a galera do roleplay em tempo real, descubra novidades e seja recompensado por participar.',
    pill: 'Gratuito', join: 'Entrar no Discord', see: 'Ver benefícios',
    what: 'O que é o Discord',
    whatText: 'O Discord é um aplicativo gratuito de conversa em grupo, para celular e computador. Em vez de uma timeline, a comunidade se organiza em canais por assunto, e todo mundo conversa na hora.',
    w1: 'Canais por assunto: bate-papo, avisos, eventos e muito mais',
    w2: 'Salas de voz para conversar e combinar o roleplay',
    w3: 'Conheça outros roleplayers e fique por dentro de tudo do Bloxter',
    perks: 'Benefícios',
    b1: 'Registre sua conta e ganhe benefícios', b1t: 'Registrando a sua conta no nosso Discord você desbloqueia benefícios exclusivos, que quem não está lá não recebe.',
    b2: 'Mensagens enviadas viram seguidores', b2t: 'Quanto mais você conversa com a comunidade, mais seguidores ganha no Bloxter. É só participar dos papos.',
    note: 'Mensagens enviadas nos canais de suporte não contam para os seguidores.',
    how: 'Como entrar',
    s1: 'Toque em “Entrar no Discord”. Se ainda não tiver o app, a conta é gratuita e leva um minutinho.',
    s2: 'Registre a sua conta do Bloxter lá no servidor para liberar os benefícios.',
    s3: 'Participe dos canais, faça amizades e veja seus seguidores crescerem a cada mensagem.',
    back: 'Voltar ao Bloxter',
  } : {
    title: 'Discord', sub: 'The live Bloxter community',
    tagline: 'Chat with the roleplay crowd in real time, catch the news first and get rewarded for taking part.',
    pill: 'Free', join: 'Join Discord', see: 'See benefits',
    what: 'What is Discord',
    whatText: 'Discord is a free group chat app for phone and computer. Instead of a timeline, the community is organized into channels by topic, and everyone talks right away.',
    w1: 'Channels by topic: chat, announcements, events and more',
    w2: 'Voice rooms to talk and plan your roleplay',
    w3: 'Meet other roleplayers and stay on top of everything Bloxter',
    perks: 'Benefits',
    b1: 'Register your account and get benefits', b1t: 'By registering your account on our Discord you unlock exclusive benefits that people who are not there do not get.',
    b2: 'Messages you send turn into followers', b2t: 'The more you chat with the community, the more followers you get on Bloxter. Just join the conversation.',
    note: 'Messages sent in the support channels do not count toward followers.',
    how: 'How to join',
    s1: 'Tap “Join Discord”. If you do not have the app yet, the account is free and takes a minute.',
    s2: 'Register your Bloxter account on the server to unlock the benefits.',
    s3: 'Join the channels, make friends and watch your followers grow with every message.',
    back: 'Back to Bloxter',
  };
  const GLYPH = '<svg viewBox="0 0 24 24" aria-hidden="true" style="width:34px;height:34px;fill:currentColor"><path d="M20.3 4.4A19.8 19.8 0 0 0 15.4 3l-.2.4a18 18 0 0 1 4.4 2.1 14.7 14.7 0 0 0-15.2 0A18 18 0 0 1 8.8 3.4L8.6 3a19.8 19.8 0 0 0-4.9 1.4C.6 9 -.3 13.5.1 18a19.9 19.9 0 0 0 6 3l1.3-2.1a12.9 12.9 0 0 1-2-1l.5-.4a14.2 14.2 0 0 0 12.2 0l.5.4c-.6.4-1.3.7-2 1l1.3 2.1a19.9 19.9 0 0 0 6-3c.5-5.2-.8-9.7-3.6-13.6ZM8.3 15.3c-1.2 0-2.1-1.1-2.1-2.4s.9-2.4 2.1-2.4 2.1 1.1 2.1 2.4-.9 2.4-2.1 2.4Zm7.4 0c-1.2 0-2.1-1.1-2.1-2.4s.9-2.4 2.1-2.4 2.1 1.1 2.1 2.4-.9 2.4-2.1 2.4Z"/></svg>';

  setTitle(T.title);
  v.innerHTML = `
    <div class="page-head"><h1>${esc(T.title)}</h1><small>${esc(T.sub)}</small></div>
    <section class="settings app-page">
      <div class="app-hero">
        <span class="app-hero-icon" style="display:grid;place-items:center;background:var(--fg);color:var(--bg)">${GLYPH}</span>
        <div class="app-hero-copy"><h2>Discord do Bloxter</h2><p>${esc(T.tagline)}</p><span class="app-pill">${esc(T.pill)}</span></div>
      </div>
      <div class="app-cta" style="display:flex;gap:10px;flex-wrap:wrap">
        <a class="btn" href="${LINK}" target="_blank" rel="noopener">${esc(T.join)}</a>
        <a class="btn ghost" href="#beneficios">${esc(T.see)}</a>
      </div>

      <h3>${esc(T.what)}</h3>
      <p class="hint" style="line-height:1.6;font-size:14px;margin-bottom:12px">${esc(T.whatText)}</p>
      <ul class="app-perks">
        <li>${ICON.comment}<span>${esc(T.w1)}</span></li>
        <li>${ICON.message || ICON.comment}<span>${esc(T.w2)}</span></li>
        <li>${ICON.userplus}<span>${esc(T.w3)}</span></li>
      </ul>

      <h3 id="beneficios">${esc(T.perks)}</h3>
      <div class="setting-card"><div class="setting-card-copy"><b>${esc(T.b1)}</b><span>${esc(T.b1t)}</span></div></div>
      <div class="setting-card"><div class="setting-card-copy"><b>${esc(T.b2)}</b><span>${esc(T.b2t)}</span></div></div>
      <p class="hint app-uninstall">${esc(T.note)}</p>

      <h3>${esc(T.how)}</h3>
      <ol class="app-steps"><li>${esc(T.s1)}</li><li>${esc(T.s2)}</li><li>${esc(T.s3)}</li></ol>
      <div class="app-cta"><a class="btn" href="${LINK}" target="_blank" rel="noopener">${esc(T.join)}</a></div>
      <p class="app-back"><a href="${logged ? '/home' : '/'}">${esc(T.back)}</a></p>
    </section>`;
})();
