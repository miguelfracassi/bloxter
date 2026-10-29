(() => {
  'use strict';

  const paper = document.getElementById('paper');
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const p2 = (n) => String(n).padStart(2, '0');
  const dateLong = (d) => `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
  const stamp = (d) => `${p2(d.getDate())}/${p2(d.getMonth() + 1)}/${d.getFullYear()} às ${p2(d.getHours())}:${p2(d.getMinutes())}`;

  let toastTimer;
  function toast(msg) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
  }

  // ---------- Texto do contrato (usado na tela e na imagem) ----------
  // {nome} e {data} viram destaque na tela; {contato} e {funcao} entram como texto simples.
  const TITLE = 'Termo de Ingressamento na Equipe e Compromisso de Sigilo';
  const INTRO = 'Eu, {nome}{contato}, declaro que hoje, {data}, estou ingressando na equipe do Bloxter e que li, entendi e concordo com tudo o que está escrito neste termo.';
  const CLAUSES = [
    { h: '1. Início na equipe', p: ['Minha participação na equipe do Bloxter começa hoje, {data}{funcao}. Este termo vale a partir do momento em que eu assinar.'] },
    { h: '2. Participação voluntária, sem remuneração', p: [
      'Estou ciente de que não recebo salário, pagamento, comissão, bônus nem qualquer valor em dinheiro (ou equivalente) por participar da equipe. Minha participação é voluntária.',
      'Também entendo que isso não cria vínculo de emprego, sociedade ou contrato de trabalho com o Bloxter nem com seus responsáveis, e que cargos, selos ou destaques dentro do Bloxter não são pagamento.',
    ] },
    { h: '3. Sigilo', p: ['Comprometo-me a manter em segredo tudo o que acontece dentro da equipe, incluindo:'], li: [
      'conversas e mensagens dos grupos, canais e chats internos da equipe;',
      'decisões, planos, votações e novidades que ainda não foram divulgadas;',
      'brigas, discussões, desentendimentos e conflitos entre membros da equipe;',
      'retiradas da equipe: quem saiu, quem foi removido e os motivos;',
      'advertências, punições, denúncias e conversas de moderação;',
      'dados de usuários, senhas, chaves e áreas restritas, como a administração.',
    ] },
    { h: '4. O que eu não posso fazer', p: ['Não vou contar, repassar, copiar, tirar print, gravar ou publicar nada disso para quem não faz parte da equipe, nem no Discord, Instagram, Roblox, grupos, conversas particulares ou qualquer outro lugar. Também não vou usar essas informações para me beneficiar ou para prejudicar alguém.'] },
    { h: '5. Saída ou retirada da equipe', p: ['Se eu sair da equipe ou for retirado(a) dela, por qualquer motivo, este sigilo continua valendo depois da saída. Também me comprometo a não expor a equipe nem seus membros por causa da minha saída ou retirada.'] },
    { h: '6. Acessos', p: ['Vou usar meus acessos somente para as minhas funções, sem compartilhá-los com ninguém. Ao sair da equipe, os acessos serão encerrados e não vou guardar nem usar nenhum material interno.'] },
    { h: '7. Quando posso falar', p: ['O sigilo não me impede de procurar os responsáveis ou as autoridades competentes se a lei exigir ou se alguém estiver em risco, por exemplo uma criança ou adolescente em perigo.'] },
    { h: '8. Se eu descumprir', p: ['Se eu quebrar este sigilo, posso ser removido(a) da equipe na mesma hora, perder todos os acessos e responder pelos prejuízos causados, conforme a lei.'] },
    { h: '9. Menores de 18 anos', p: ['Se eu tiver menos de 18 anos, declaro que meu responsável legal sabe e concorda com a minha participação na equipe.'] },
    { h: '10. Assinatura', p: ['Minha assinatura desenhada neste aparelho, junto com a data e a hora do envio, vale como minha aceitação deste termo.'] },
  ];

  // Troca os {campos}. `html`: devolve HTML (com destaque); senão, texto puro.
  function fill(str, v, html) {
    return str.replace(/\{(\w+)\}/g, (_, k) => {
      const val = v[k] || '';
      if (!html) return k === 'nome' && !val ? '____________________' : val;
      if (k === 'nome') return `<span class="tc-fill${val ? '' : ' empty'}">${val ? esc(val) : '(seu nome completo)'}</span>`;
      if (k === 'data') return `<span class="tc-fill">${esc(val)}</span>`;
      return esc(val);
    });
  }

  function values(now) {
    const nome = f.name.value.replace(/\s+/g, ' ').trim();
    const contato = f.contact.value.trim();
    const funcao = f.role.value.trim();
    return { nome, contato: contato ? ` (${contato})` : '', funcao: funcao ? `, na função de ${funcao}` : '', data: dateLong(now), contatoRaw: contato, funcaoRaw: funcao };
  }

  // ---------- Tela ----------
  paper.innerHTML = `
    <div class="tc-brand">BLOXTER · EQUIPE</div>
    <h1>${esc(TITLE)}</h1>
    <p class="tc-date" id="tc-today"></p>
    <div id="tc-body"></div>
    <form class="tc-form" id="tc-form" autocomplete="off" novalidate>
      <div class="tc-grid">
        <label class="f">Nome completo *<input type="text" name="name" maxlength="80" placeholder="Seu nome" autocomplete="name" /></label>
        <label class="f">Seu @ no Bloxter ou Discord<input type="text" name="contact" maxlength="60" placeholder="Opcional" /></label>
      </div>
      <label class="f">Função na equipe<input type="text" name="role" maxlength="60" placeholder="Opcional (ex.: Moderador, Suporte)" /></label>
      <div class="tc-padwrap">
        <div class="tc-padhead"><span>Assine abaixo com o dedo ou o mouse *</span><button class="btn ghost sm" type="button" id="tc-clear">Limpar</button></div>
        <div class="tc-pad" id="tc-pad"><canvas id="tc-canvas" aria-label="Campo de assinatura"></canvas><div class="line"></div><div class="hint" id="tc-hint">Assine aqui</div></div>
      </div>
      <label class="tc-chk"><input type="checkbox" name="agree" /> <span>Li o termo acima, entendi e concordo. Sei que não recebo pagamento e que devo manter sigilo sobre tudo da equipe.</span></label>
      <div class="tc-err" id="tc-err" role="alert"></div>
      <button class="btn" type="submit" id="tc-send">Assinar e enviar</button>
    </form>`;

  const f = document.getElementById('tc-form').elements;
  const body = document.getElementById('tc-body');
  const err = document.getElementById('tc-err');

  function renderBody() {
    const now = new Date();
    const v = values(now);
    document.getElementById('tc-today').textContent = `Hoje: ${dateLong(now)}`;
    body.innerHTML = `<p>${fill(INTRO, v, true)}</p>` + CLAUSES.map((c) => `
      <h2>${esc(c.h)}</h2>
      ${(c.p || []).map((t) => `<p>${fill(t, v, true)}</p>`).join('')}
      ${c.li ? `<ul>${c.li.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}`).join('');
  }
  ['name', 'contact', 'role'].forEach((k) => f[k].addEventListener('input', renderBody));
  renderBody();

  // ---------- Campo de assinatura ----------
  const canvas = document.getElementById('tc-canvas');
  const hint = document.getElementById('tc-hint');
  const ctx = canvas.getContext('2d');
  canvas.width = 900;
  canvas.height = 300;
  let inkLen = 0;
  let drawing = false;
  let last = null;
  let mid = null;

  function resetPad() {
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#111';
    ctx.fillStyle = '#111';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    inkLen = 0;
    hint.style.display = '';
  }
  resetPad();

  const pos = (e) => {
    const r = canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * canvas.width) / r.width, y: ((e.clientY - r.top) * canvas.height) / r.height };
  };
  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    try { canvas.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    drawing = true;
    last = pos(e);
    mid = last;
    ctx.beginPath();
    ctx.arc(last.x, last.y, 2.5, 0, Math.PI * 2);
    ctx.fill();
    hint.style.display = 'none';
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drawing) return;
    e.preventDefault();
    const p = pos(e);
    const m = { x: (last.x + p.x) / 2, y: (last.y + p.y) / 2 };
    ctx.beginPath();
    ctx.moveTo(mid.x, mid.y);
    ctx.quadraticCurveTo(last.x, last.y, m.x, m.y);
    ctx.stroke();
    inkLen += Math.hypot(p.x - last.x, p.y - last.y);
    mid = m;
    last = p;
  });
  const stopDraw = () => { drawing = false; };
  canvas.addEventListener('pointerup', stopDraw);
  canvas.addEventListener('pointercancel', stopDraw);
  canvas.addEventListener('pointerleave', stopDraw);
  document.getElementById('tc-clear').addEventListener('click', resetPad);

  // ---------- Imagem do contrato assinado (PNG) ----------
  function paint(g, draw, v, now) {
    const W = 1080;
    const PAD = 84;
    const TW = W - PAD * 2;
    let y = 0;
    const setFont = (weight, size) => { g.font = `${weight} ${size}px Poppins, "Helvetica Neue", Arial, sans-serif`; };

    function lines(str, width) {
      const out = [];
      let cur = '';
      for (const word of String(str).split(/\s+/)) {
        let w = word;
        while (g.measureText(w).width > width) {
          let i = w.length - 1;
          while (i > 1 && g.measureText(w.slice(0, i)).width > width) i -= 1;
          if (cur) { out.push(cur); cur = ''; }
          out.push(w.slice(0, i));
          w = w.slice(i);
        }
        const test = cur ? `${cur} ${w}` : w;
        if (cur && g.measureText(test).width > width) { out.push(cur); cur = w; } else cur = test;
      }
      if (cur) out.push(cur);
      return out;
    }
    function text(str, o = {}) {
      const { size = 25, weight = 400, color = '#1a1a1a', lh = 1.6, x = PAD, width = TW, after = 0 } = o;
      setFont(weight, size);
      for (const line of lines(str, width)) {
        if (draw) { g.fillStyle = color; g.textBaseline = 'top'; g.fillText(line, x, y + (size * lh - size) / 2); }
        y += size * lh;
      }
      y += after;
    }

    y = 0;
    if (draw) { g.fillStyle = '#111'; g.fillRect(0, 0, W, 14); }
    y = 14 + 70;
    text('BLOXTER · EQUIPE', { size: 22, weight: 700, color: '#777', after: 8 });
    text(TITLE, { size: 42, weight: 700, color: '#000', lh: 1.25, after: 8 });
    text(`Data: ${v.data}`, { size: 23, color: '#777', after: 30 });
    text(fill(INTRO, v, false), { after: 6 });
    for (const c of CLAUSES) {
      y += 22;
      text(c.h, { size: 27, weight: 700, color: '#000', lh: 1.4, after: 4 });
      for (const t of c.p || []) text(fill(t, v, false), { after: 4 });
      for (const t of c.li || []) {
        if (draw) { g.fillStyle = '#1a1a1a'; g.beginPath(); g.arc(PAD + 14, y + 20, 4.5, 0, Math.PI * 2); g.fill(); }
        text(t, { x: PAD + 38, width: TW - 38, after: 2 });
      }
    }

    // Bloco de assinatura
    y += 54;
    if (draw) { g.strokeStyle = '#d8d8d8'; g.lineWidth = 2; g.beginPath(); g.moveTo(PAD, y); g.lineTo(W - PAD, y); g.stroke(); }
    y += 34;
    text('Assinatura', { size: 27, weight: 700, color: '#000', after: 10 });
    const sw = 600;
    const sh = sw / 3;
    if (draw) {
      g.drawImage(canvas, PAD, y, sw, sh);
      g.strokeStyle = '#111';
      g.lineWidth = 2;
      g.beginPath(); g.moveTo(PAD, y + sh); g.lineTo(PAD + sw + 40, y + sh); g.stroke();
    }
    y += sh + 14;
    text(v.nome, { size: 28, weight: 600, color: '#000', lh: 1.4 });
    const extra = [v.contatoRaw, v.funcaoRaw].filter(Boolean).join(' · ');
    if (extra) text(extra, { size: 22, color: '#555', lh: 1.4 });
    text(`Assinado eletronicamente em ${stamp(now)}`, { size: 22, color: '#555', lh: 1.5 });
    y += 36;
    text('bloxter.sbs/team/contratoingressamento', { size: 19, color: '#999', after: 0 });
    y += PAD - 30;
    return Math.ceil(y);
  }

  function buildImage(v, now) {
    const scratch = document.createElement('canvas').getContext('2d');
    const h = paint(scratch, false, v, now);
    const c = document.createElement('canvas');
    c.width = 1080;
    c.height = h;
    const g = c.getContext('2d');
    g.fillStyle = '#fff';
    g.fillRect(0, 0, c.width, c.height);
    paint(g, true, v, now);
    return c.toDataURL('image/png');
  }

  // ---------- Envio ----------
  const slug = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'membro';

  function showDone(dataUrl, name, sent) {
    paper.innerHTML = `<div class="tc-done">
      <div class="tc-ok" aria-hidden="true">✓</div>
      <h1 style="margin:0">${sent ? 'Contrato assinado!' : 'Contrato gerado'}</h1>
      <p style="margin:0">${sent ? 'Seu contrato foi enviado para a administração do Bloxter. Você já pode fechar esta página.' : 'Não foi possível enviar agora. Baixe a imagem e envie para a administração.'}</p>
      <img src="${dataUrl}" alt="Contrato assinado" />
      <a class="btn" href="${dataUrl}" download="contrato-ingressamento-${esc(slug(name))}.png">Baixar minha cópia</a>
    </div>`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  document.getElementById('tc-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    err.textContent = '';
    const btn = document.getElementById('tc-send');
    const nome = f.name.value.replace(/\s+/g, ' ').trim();
    if (nome.length < 3) { err.textContent = 'Digite seu nome completo.'; f.name.focus(); return; }
    if (inkLen < 60) { err.textContent = 'Faça sua assinatura no quadro.'; return; }
    if (!f.agree.checked) { err.textContent = 'Marque que leu e concorda com o termo.'; return; }
    btn.disabled = true;
    btn.textContent = 'Enviando...';
    let dataUrl;
    const now = new Date();
    try {
      try { await Promise.all([document.fonts.load('400 25px Poppins'), document.fonts.load('600 25px Poppins'), document.fonts.load('700 25px Poppins')]); } catch { /* usa fonte reserva */ }
      dataUrl = buildImage(values(now), now);
    } catch {
      err.textContent = 'Não foi possível gerar a imagem. Tente de novo.';
      btn.disabled = false;
      btn.textContent = 'Assinar e enviar';
      return;
    }
    try {
      const res = await fetch('/api/team/contract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nome, contact: f.contact.value.trim(), role: f.role.value.trim(), image: dataUrl }),
      });
      if (res.status === 429) throw Object.assign(new Error('rate'), { rate: true });
      if (!res.ok) throw new Error('send');
      showDone(dataUrl, nome, true);
    } catch (x) {
      if (x.rate) {
        err.textContent = 'Muitas tentativas seguidas. Espere um pouco e tente de novo.';
        btn.disabled = false;
        btn.textContent = 'Assinar e enviar';
        return;
      }
      showDone(dataUrl, nome, false);
    }
  });
})();
