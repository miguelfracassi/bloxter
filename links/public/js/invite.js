(async () => {
  const { $, esc, t, errMsg, api, toast, ICON, avatar, ago, accountPath, setTitle } = window.BX;
  const v = await BX.init({ auth: 'required', shell: 'app', active: 'invite' });
  if (!v) return;

  const GOALS = [1, 5, 10, 25, 50, 100];
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let data = null;

  const linkOf = (code) => `${location.origin}/signup?ref=${code}`;
  const messageOf = (code) => t('invite.message', { link: linkOf(code) });

  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch { /* tenta o método antigo */ }
    try {
      const ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
      document.body.appendChild(ta); ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch { return false; }
  }

  // Chuva de emojis curta, só para dar vida ao copiar/ganhar.
  function burst(origin, emoji = '🎉') {
    if (reduceMotion || !origin) return;
    const r = origin.getBoundingClientRect();
    for (let i = 0; i < 12; i += 1) {
      const p = document.createElement('span');
      p.className = 'inv-pop';
      p.textContent = emoji;
      p.style.left = `${r.left + r.width / 2}px`;
      p.style.top = `${r.top + r.height / 2}px`;
      p.style.setProperty('--dx', `${Math.round((Math.random() - 0.5) * 220)}px`);
      p.style.setProperty('--dy', `${-Math.round(60 + Math.random() * 130)}px`);
      p.style.setProperty('--rot', `${Math.round((Math.random() - 0.5) * 120)}deg`);
      document.body.appendChild(p);
      setTimeout(() => p.remove(), 1100);
    }
  }

  function countUp(el, to) {
    const end = Number(to) || 0;
    if (reduceMotion || end === 0) { el.textContent = end.toLocaleString(); return; }
    const start = performance.now(), dur = 900;
    const tick = (now) => {
      const k = Math.min(1, (now - start) / dur);
      el.textContent = Math.round(end * (1 - Math.pow(1 - k, 3))).toLocaleString();
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  function goalHTML(joined) {
    const next = GOALS.find((g) => g > joined);
    const prev = [...GOALS].reverse().find((g) => g <= joined) || 0;
    const pct = next ? Math.max(4, Math.round(((joined - prev) / (next - prev)) * 100)) : 100;
    const dots = GOALS.map((g) => `<span class="inv-dot ${joined >= g ? 'on' : ''}" title="${g}"><i>${joined >= g ? '✓' : ''}</i><small>${g}</small></span>`).join('');
    return `<div class="inv-goal">
      <div class="inv-goal-top"><b>${esc(t('invite.goal'))}</b><span>${next ? esc(t('invite.goalLeft', { n: next - joined, goal: next })) : esc(t('invite.goalDone'))}</span></div>
      <div class="inv-bar"><div class="inv-bar-fill" style="width:${pct}%"></div></div>
      <div class="inv-dots">${dots}</div>
    </div>`;
  }

  function referralHTML(r) {
    const u = r.user;
    const tag = r.status === 'ok'
      ? `<span class="inv-plus">+${r.reward}</span>`
      : `<span class="inv-review">${esc(t('invite.review'))}</span>`;
    return `<a class="inv-row" href="${esc(accountPath(u.username))}">
      ${avatar(u)}
      <span class="inv-row-meta"><b>${esc(u.name)}</b><small>@${esc(u.username)} · ${esc(ago(r.created_at))}</small></span>
      ${tag}
    </a>`;
  }

  function render() {
    const d = data, s = d.stats, link = linkOf(d.code), msg = messageOf(d.code);
    const canShare = typeof navigator.share === 'function';
    v.innerHTML = `
      <div class="page-head"><div><h1>${esc(t('invite.title'))}</h1><small>${esc(t('invite.sub'))}</small></div>
        <button class="btn ghost sm" data-inv="refresh" type="button" aria-label="Atualizar">↻</button></div>
      <div class="inv">
        <section class="inv-hero">
          <div class="inv-float" aria-hidden="true"><span>🎁</span><span>✨</span><span>👥</span></div>
          <h2>${esc(t('invite.hero1'))}<br /><em>${esc(t('invite.hero2'))}</em></h2>
          <p>${esc(t('invite.heroText', { n: d.reward }))}</p>
          <span class="inv-pill">${esc(t('invite.reward', { n: d.reward }))}</span>
        </section>

        <section class="inv-card">
          <h3>${esc(t('invite.yourLink'))}</h3>
          <div class="inv-link">
            <input id="inv-link" type="text" readonly value="${esc(link)}" aria-label="${esc(t('invite.yourLink'))}" />
            <button class="btn" data-inv="copy" type="button">${esc(t('invite.copy'))}</button>
          </div>
          <div class="inv-actions">
            <button class="btn ghost sm" data-inv="regen" type="button">↻ ${esc(t('invite.regen'))}</button>
          </div>
        </section>

        <section class="inv-card">
          <h3>${esc(t('invite.share'))}</h3>
          <p class="inv-hint">${esc(t('invite.shareReady'))}</p>
          <div class="inv-msg">${esc(msg)}</div>
          <div class="inv-share">
            <button class="btn" data-inv="whats" type="button">${esc(t('invite.shareWhats'))}</button>
            <button class="btn" data-inv="insta" type="button">${esc(t('invite.shareInsta'))}</button>
            ${canShare ? `<button class="btn ghost" data-inv="native" type="button">${esc(t('invite.share'))}…</button>` : ''}
            <button class="btn ghost" data-inv="copymsg" type="button">${esc(t('invite.shareCopyMsg'))}</button>
          </div>
        </section>

        <div class="inv-warn" role="alert"><span aria-hidden="true">⚠️</span><p>${esc(t('invite.warn'))}</p></div>

        <section class="inv-card">
          <h3>${esc(t('invite.how'))}</h3>
          <ol class="inv-steps">
            <li><b>1</b><div><strong>${esc(t('invite.step1'))}</strong><small>${esc(t('invite.step1t'))}</small></div></li>
            <li><b>2</b><div><strong>${esc(t('invite.step2'))}</strong><small>${esc(t('invite.step2t'))}</small></div></li>
            <li><b>3</b><div><strong>${esc(t('invite.step3'))}</strong><small>${esc(t('invite.step3t', { n: d.reward }))}</small></div></li>
          </ol>
        </section>

        <section class="inv-card">
          <h3>${esc(t('invite.stats'))}</h3>
          <div class="inv-stats">
            <div class="inv-stat"><b data-count="${s.joined}">0</b><small>${esc(t('invite.statJoined'))}</small></div>
            <div class="inv-stat hot"><b data-count="${s.earned}">0</b><small>${esc(t('invite.statEarned'))}</small></div>
            <div class="inv-stat"><b data-count="${s.today}">0</b><small>${esc(t('invite.statToday'))}</small></div>
            <div class="inv-stat"><b data-count="${s.week}">0</b><small>${esc(t('invite.statWeek'))}</small></div>
            <div class="inv-stat wide"><b data-count="${s.followers}">0</b><small>${esc(t('invite.statFollowers'))}</small></div>
            ${s.review ? `<div class="inv-stat wide"><b data-count="${s.review}">0</b><small>${esc(t('invite.statReview'))}</small></div>` : ''}
          </div>
          ${goalHTML(s.joined)}
          ${d.invited_by ? `<p class="inv-by">${esc(d.invited_by.status === 'ok' ? t('invite.invitedBy', { name: d.invited_by.name, n: d.invited_by.reward }) : t('invite.invitedByReview', { name: d.invited_by.name }))}</p>` : ''}
        </section>

        <section class="inv-card">
          <h3>${esc(t('invite.who'))}</h3>
          <div class="inv-list">${d.referrals.length ? d.referrals.map(referralHTML).join('') : `<div class="empty"><b>👀</b>${esc(t('invite.whoEmpty'))}</div>`}</div>
        </section>
      </div>`;
    v.querySelectorAll('[data-count]').forEach((el) => countUp(el, el.dataset.count));
  }

  async function load(quiet) {
    try {
      data = await api('invites');
      render();
    } catch (e) {
      if (!quiet || !data) v.innerHTML = `<div class="empty">${esc(errMsg(e))}</div>`;
    }
  }

  v.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-inv]');
    if (!btn || !data) return;
    const act = btn.dataset.inv;
    const link = linkOf(data.code), msg = messageOf(data.code);
    if (act === 'copy') {
      const ok = await copyText(link);
      if (ok) {
        $('#inv-link')?.select();
        btn.textContent = `✓ ${t('invite.copied')}`;
        setTimeout(() => { btn.textContent = t('invite.copy'); }, 1800);
        burst(btn, '🎉');
      } else { $('#inv-link')?.select(); }
      toast(ok ? t('invite.copied') : link);
    } else if (act === 'copymsg') {
      toast((await copyText(msg)) ? t('invite.msgCopied') : msg);
      burst(btn, '💬');
    } else if (act === 'whats') {
      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
    } else if (act === 'insta') {
      // O Instagram não aceita texto pronto por link: copiamos a mensagem e abrimos o Direct.
      await copyText(msg);
      toast(t('invite.instaCopied'));
      window.open('https://www.instagram.com/direct/inbox/', '_blank', 'noopener');
    } else if (act === 'native') {
      try { await navigator.share({ text: msg }); } catch { /* cancelado */ }
    } else if (act === 'regen') {
      if (!confirm(t('invite.regenConfirm'))) return;
      btn.disabled = true;
      try {
        await api('invites/regenerate', { method: 'POST' });
        await load(false);
        toast(t('invite.regenDone'));
        burst($('[data-inv="copy"]'), '✨');
      } catch (err) {
        btn.disabled = false;
        toast(err && err.code === 'rate_limited' ? t('invite.regenWait') : errMsg(err));
      }
    } else if (act === 'refresh') {
      btn.disabled = true;
      await load(true);
    }
  });

  // Ao voltar para a aba, atualiza a lista de quem entrou (sem ficar consultando o tempo todo).
  document.addEventListener('visibilitychange', () => { if (!document.hidden && data) load(true); });

  setTitle(t('invite.title'));
  v.innerHTML = `<div class="loading">${esc(t('loading'))}</div>`;
  load(false);
})();
