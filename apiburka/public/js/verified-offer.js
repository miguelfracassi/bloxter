/* Bloxter — banner "Seja verificado" da página inicial.
   O administrador liga/desliga em /administracao. Enquanto estiver ligado, quem ainda não é
   verificado vê o banner; ao clicar, a API dá o selo e tocamos confete + animação.
   Sem bibliotecas externas: o confete é desenhado num <canvas>. */
(() => {
  'use strict';
  const SESSION_KEY = 'bx_verified_banner';
  const COLORS = ['#2e96ff', '#ffffff', '#ffd54a', '#ff5d8f', '#4be1a0', '#9b7bff'];
  const reduceMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- confete ---------- */
  function confetti(originEl) {
    if (reduceMotion()) return;
    const canvas = document.createElement('canvas');
    canvas.className = 'vcel-confetti';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    const fit = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
    };
    fit();
    window.addEventListener('resize', fit);

    const r = originEl ? originEl.getBoundingClientRect() : null;
    const ox = r ? r.left + r.width / 2 : window.innerWidth / 2;
    const oy = r ? r.top + r.height / 2 : window.innerHeight / 2;
    const parts = [];
    const burst = (n, power, delay) => {
      for (let i = 0; i < n; i += 1) {
        const ang = Math.random() * Math.PI * 2;
        const sp = power * (0.35 + Math.random() * 0.65);
        parts.push({
          x: ox, y: oy, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - power * 0.25,
          w: 6 + Math.random() * 7, h: 4 + Math.random() * 6, round: Math.random() < 0.3,
          rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.4,
          color: COLORS[(Math.random() * COLORS.length) | 0], wob: Math.random() * 6.28,
          life: 0, wait: delay,
        });
      }
    };
    burst(110, 17, 0);
    burst(70, 12, 260);
    // chuva de confete caindo do topo
    for (let i = 0; i < 70; i += 1) {
      parts.push({
        x: Math.random() * window.innerWidth, y: -20 - Math.random() * 200, vx: (Math.random() - 0.5) * 2, vy: 2 + Math.random() * 3,
        w: 6 + Math.random() * 6, h: 4 + Math.random() * 5, round: Math.random() < 0.3,
        rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.3, color: COLORS[(Math.random() * COLORS.length) | 0],
        wob: Math.random() * 6.28, life: 0, wait: 400 + Math.random() * 900,
      });
    }

    const start = performance.now();
    let last = start;
    const DURATION = 5200;
    function frame(now) {
      const dt = Math.min((now - last) / 16.67, 3);
      last = now;
      const elapsed = now - start;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      let alive = 0;
      for (const p of parts) {
        if (elapsed < p.wait) { alive += 1; continue; }
        p.life += dt;
        p.vx *= 0.985; p.vy = p.vy * 0.992 + 0.32 * dt;
        p.wob += 0.08 * dt;
        p.x += (p.vx + Math.sin(p.wob) * 0.9) * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
        if (p.y > window.innerHeight + 30) continue;
        alive += 1;
        const fade = elapsed > DURATION - 900 ? Math.max(0, (DURATION - elapsed) / 900) : 1;
        ctx.save();
        ctx.globalAlpha = fade;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        // "vira" a folha de confete enquanto cai
        const flip = Math.cos(p.wob * 1.3);
        if (p.round) { ctx.beginPath(); ctx.ellipse(0, 0, p.w / 2, (p.w / 2) * Math.abs(flip) + 0.5, 0, 0, 6.28); ctx.fill(); }
        else ctx.fillRect(-p.w / 2, (-p.h / 2) * flip, p.w, p.h * flip || 1);
        ctx.restore();
      }
      if (alive > 0 && elapsed < DURATION) requestAnimationFrame(frame);
      else { window.removeEventListener('resize', fit); canvas.remove(); }
    }
    requestAnimationFrame(frame);
  }

  /* ---------- animação de "Verificado" ---------- */
  function celebrate() {
    return new Promise((resolve) => {
      const prev = document.activeElement;
      const o = document.createElement('div');
      o.className = 'vcel';
      o.setAttribute('role', 'dialog');
      o.setAttribute('aria-modal', 'true');
      o.setAttribute('aria-label', 'Você foi verificado');
      o.innerHTML = `
        <div class="vcel-card">
          <div class="vcel-badge"><i class="vcel-ring"></i><i class="vcel-ring r2"></i><img src="/verificado.png" alt="" width="128" height="128" /></div>
          <h2>Você agora é verificado!</h2>
          <p>O selo azul já aparece no seu perfil e nas suas publicações.</p>
          <button class="btn" type="button" data-vcel-ok>Continuar</button>
        </div>`;
      document.body.appendChild(o);
      const logo = o.querySelector('.vcel-badge');
      const ok = o.querySelector('[data-vcel-ok]');
      let closed = false;
      const close = () => {
        if (closed) return;
        closed = true;
        document.removeEventListener('keydown', onKey);
        o.classList.add('out');
        setTimeout(() => { o.remove(); try { prev && prev.focus && prev.focus(); } catch { /* ignore */ } resolve(); }, 220);
      };
      const onKey = (e) => { if (e.key === 'Escape' || e.key === 'Enter') close(); };
      document.addEventListener('keydown', onKey);
      ok.addEventListener('click', close);
      o.addEventListener('click', (e) => { if (e.target === o) close(); });
      requestAnimationFrame(() => { o.classList.add('on'); ok.focus({ preventScroll: true }); });
      // o confete sai do selo assim que ele "estoura" na tela
      setTimeout(() => confetti(logo), reduceMotion() ? 0 : 380);
    });
  }

  /* ---------- banner ---------- */
  async function mount(view, { api, state, toast, errMsg, onVerified }) {
    if (!view || !state || !state.me || state.me.verified) return;
    try { if (sessionStorage.getItem(SESSION_KEY) === '1') return; } catch { /* sem sessionStorage */ }
    let offer;
    try { offer = await api('me/verified-offer'); } catch { return; }
    if (!offer || !offer.show || !view.isConnected || view.querySelector('#verified-card')) return;

    const card = document.createElement('aside');
    card.className = 'verified-card';
    card.id = 'verified-card';
    card.setAttribute('aria-label', 'Seja verificado');
    card.innerHTML = `
      <img class="verified-logo" src="/verificado.png" alt="" width="96" height="96" />
      <div class="verified-text">
        <b>Quer ser verificado?</b>
        <span>Para conseguir é só clicar e pronto!</span>
        <button class="btn sm verified-cta" type="button" data-verified-claim>Quero ser verificado</button>
      </div>
      <button class="election-close" type="button" aria-label="Fechar aviso" data-verified-close>×</button>`;
    const anchor = view.querySelector('.composer');
    if (anchor) anchor.before(card); else view.prepend(card);

    const cta = card.querySelector('[data-verified-claim]');
    const dismiss = () => {
      card.remove();
      try { sessionStorage.setItem(SESSION_KEY, '1'); } catch { /* ignore */ }
    };
    card.querySelector('[data-verified-close]').addEventListener('click', (e) => { e.stopPropagation(); dismiss(); });

    let busy = false;
    const claim = async () => {
      if (busy) return;
      busy = true;
      cta.disabled = true;
      cta.textContent = 'Verificando…';
      try {
        await api('me/verified', { method: 'POST' });
        state.me.verified = true;
        card.remove();
        await celebrate();
        if (typeof onVerified === 'function') onVerified();
      } catch (e) {
        busy = false;
        cta.disabled = false;
        cta.textContent = 'Quero ser verificado';
        toast(errMsg(e));
        if (e && e.code === 'verified_offer_closed') card.remove();
      }
    };
    // o banner inteiro é clicável (o × fecha sem verificar)
    card.addEventListener('click', claim);
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target === card) { e.preventDefault(); claim(); } });
  }

  window.BXVerifiedOffer = { mount, celebrate };
})();
