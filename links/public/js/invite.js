(async () => {
  const { $, esc, t, errMsg, api, toast, ICON, avatar, ago, accountPath, setTitle } = window.BX;
  const v = await BX.init({ auth: 'required', shell: 'app', active: 'invite' });
  if (!v) return;

  // Ícones SVG (sem emojis).
  const SVG = {"gift": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><rect x=\"3\" y=\"8\" width=\"18\" height=\"4\" rx=\"1\"/><path d=\"M12 8v13M5 12v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8\"/><path d=\"M7.5 8a2.5 2.5 0 0 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 0 1 0 5\"/></svg>", "spark": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z\"/><path d=\"M19 15l.7 1.8L21.5 17.5l-1.8.7L19 20l-.7-1.8-1.8-.7 1.8-.7z\"/></svg>", "users": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><circle cx=\"9\" cy=\"8\" r=\"3\"/><path d=\"M3 19v-1a6 6 0 0 1 12 0v1M16 5.5a3 3 0 0 1 0 5.8M18 14a5 5 0 0 1 3 4v1\"/></svg>", "warn": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M10.3 3.9L2.4 17.5A2 2 0 0 0 4.1 20.5h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z\"/><path d=\"M12 9v4M12 17h.01\"/></svg>", "refresh": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M20 11a8 8 0 0 0-14.5-4.5L4 8M4 4v4h4M4 13a8 8 0 0 0 14.5 4.5L20 16M20 20v-4h-4\"/></svg>", "check": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M5 12.5l4.5 4.5L19 7.5\"/></svg>", "star": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M12 3l2.6 5.6 6 .7-4.4 4.1 1.2 6L12 16.5 6.6 19.4l1.2-6L3.4 9.3l6-.7z\"/></svg>", "heart": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M12 20s-7-4.4-9-9a4.8 4.8 0 0 1 9-2.5A4.8 4.8 0 0 1 21 11c-2 4.6-9 9-9 9z\"/></svg>"};
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
  function burst(origin, kind = 'star') {
    if (reduceMotion || !origin) return;
    const r = origin.getBoundingClientRect();
    const shapes = [SVG[kind] || SVG.star, SVG.star, SVG.heart, SVG.spark];
    for (let i = 0; i < 12; i += 1) {
      const p = document.createElement('span');
      p.className = 'inv-pop';
      p.innerHTML = shapes[i % shapes.length];
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
    const dots = GOALS.map((g) => `<span class="inv-dot ${joined >= g ? 'on' : ''}" title="${g}"><i>${joined >= g ? SVG.check : ''}</i><small>${g}</small></span>`).join('');
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
        <button class="btn ghost sm" data-inv="refresh" type="button" aria-label="Atualizar">${SVG.refresh}</button></div>
      <div class="inv">
        <section class="inv-hero">
          <div class="inv-float" aria-hidden="true"><span>${SVG.gift}</span><span>${SVG.spark}</span><span>${SVG.users}</span></div>
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
            <button class="btn ghost sm" data-inv="regen" type="button">${SVG.refresh} ${esc(t('invite.regen'))}</button>
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

        <div class="inv-warn" role="alert"><span class="inv-warn-ico" aria-hidden="true">${SVG.warn}</span><p>${esc(t('invite.warn'))}</p></div>

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
          <div class="inv-list">${d.referrals.length ? d.referrals.map(referralHTML).join('') : `<div class="empty"><b class="inv-empty-ico">${SVG.users}</b>${esc(t('invite.whoEmpty'))}</div>`}</div>
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
        btn.innerHTML = `${SVG.check} ${esc(t('invite.copied'))}`;
        setTimeout(() => { btn.textContent = t('invite.copy'); }, 1800);
        burst(btn, 'star');
      } else { $('#inv-link')?.select(); }
      toast(ok ? t('invite.copied') : link);
    } else if (act === 'copymsg') {
      toast((await copyText(msg)) ? t('invite.msgCopied') : msg);
      burst(btn, 'heart');
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
        burst($('[data-inv="copy"]'), 'spark');
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
