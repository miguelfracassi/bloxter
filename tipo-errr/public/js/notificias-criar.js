(() => {
  const app = document.getElementById('app');
  const toastNode = document.getElementById('toast');
  let photo = null;
  let photoUrl = '';
  let adminSession = false;
  const $ = (selector, root = app) => root.querySelector(selector);
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const api = async (path, method = 'GET', body) => {
    const response = await fetch(`/api/${path}`, { method, credentials: 'same-origin', headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) { const error = new Error(data.error || 'request_failed'); error.status = response.status; throw error; }
    return data;
  };
  const brand = `<header class="top"><a class="brand" href="/home"><img src="/symbol.png" alt=""><span>Bloxter · Criar notícia</span></a><div class="top-actions"><a class="plain" href="/administracao">Administração</a><a class="plain" href="/home">Voltar ao site</a></div></header>`;
  const toast = (message) => { toastNode.textContent = message; toastNode.classList.add('show'); clearTimeout(toast.timer); toast.timer = setTimeout(() => toastNode.classList.remove('show'), 2400); };

  function login(error = '') {
    app.innerHTML = `${brand}<main class="login-wrap"><section class="login-card"><span class="eyebrow">FERRAMENTA INTERNA</span><h1>Criar post de notícia</h1><p>Entre com a senha da administração do Bloxter para abrir o editor.</p><form id="admin-login" class="field"><label for="admin-password">Senha administrativa</label><input id="admin-password" name="password" type="password" autocomplete="current-password" required><p class="error" role="alert">${esc(error)}</p><button class="btn full" type="submit">Acessar o editor</button></form></section></main><footer class="footer"><span>© ${new Date().getFullYear()} Bloxter</span><span>From Ticord</span></footer>`;
    $('#admin-login').addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const button = form.querySelector('button');
      const errorNode = form.querySelector('.error');
      button.disabled = true;
      try { await api('admin/login', 'POST', { password: form.password.value }); adminSession = true; editor(); }
      catch (error) { errorNode.textContent = error.status === 401 ? 'Senha incorreta.' : 'Não foi possível entrar. Tente novamente.'; button.disabled = false; }
    });
  }

  function editor() {
    app.innerHTML = `${brand}<main class="wrap"><header class="heading"><div><span class="eyebrow">POST PARA INSTAGRAM</span><h1>Monte sua notícia</h1><p>Escolha uma foto, escreva a chamada e salve a arte em PNG.</p></div><span class="format">FEED · 1080 × 1350 · 4:5</span></header><div class="grid"><section class="panel"><h2>Conteúdo da publicação</h2><div class="field"><label for="photo-input">Foto de fundo</label><label class="upload" id="upload-zone" for="photo-input"><span><span class="upload-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4m0 0L7 9m5-5 5 5"/><path d="M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4"/></svg></span><b>Escolher ou soltar uma foto</b><span>PNG, JPG ou WebP · até 10 MB</span></span></label><input id="photo-input" type="file" accept="image/png,image/jpeg,image/webp" hidden><div class="file-meta" id="file-meta">Nenhuma foto selecionada.</div></div><div class="field"><label for="news-title">Notícia</label><textarea id="news-title" maxlength="180" placeholder="Escreva a chamada principal da notícia…" required></textarea><small><span id="char-count">0</span>/180 · O texto fica sobre a faixa escura na parte inferior.</small></div><div class="field"><label for="news-label">Categoria</label><input id="news-label" maxlength="28" value="NOTÍCIA" placeholder="Ex.: COMUNICADO"></div><div class="sliders"><label class="range-field"><span class="range-head"><span>Tamanho da fonte</span><span id="font-value">72 px</span></span><input id="font-size" type="range" min="28" max="100" value="72"></label><label class="range-field"><span class="range-head"><span>Zoom da foto</span><span id="zoom-value">100%</span></span><input id="zoom" type="range" min="100" max="180" value="100"></label><label class="range-field"><span class="range-head"><span>Enquadramento vertical</span><span id="position-value">50%</span></span><input id="position" type="range" min="0" max="100" value="50"></label></div><div class="actions"><button class="btn" id="save-png" type="button" disabled>Salvar imagem PNG</button><button class="btn secondary" id="clear-form" type="button">Limpar</button></div><p class="help">A imagem é montada no seu navegador e baixada em 1080 × 1350 px. Se o texto for longo, a fonte pode diminuir para caber. A foto escolhida não é enviada ao Bloxter.</p></section><section class="panel preview-panel"><div class="preview-head"><h2>Prévia do post</h2><span>prévia em proporção 4:5</span></div><div class="canvas-wrap"><div class="preview"><canvas id="post-canvas" width="1080" height="1350" aria-label="Prévia da notícia para Instagram"></canvas></div></div><div class="preview-bottom"><span>A sombra inferior melhora a leitura do texto sobre a foto.</span><button class="btn" id="save-png-preview" type="button" disabled>Baixar PNG</button></div></section></div></main><footer class="footer"><span>© ${new Date().getFullYear()} Bloxter</span><span>From Ticord</span><button class="plain" id="admin-logout" type="button">Sair do editor</button></footer>`;
    const canvas = $('#post-canvas');
    const ctx = canvas.getContext('2d');
    const input = $('#photo-input');
    const upload = $('#upload-zone');
    const title = $('#news-title');
    const label = $('#news-label');
    const fontSize = $('#font-size');
    const zoom = $('#zoom');
    const position = $('#position');
    const saveButtons = [$('#save-png'), $('#save-png-preview')];
    const render = () => drawPost(ctx, canvas, photo, title.value.trim(), label.value.trim(), Number(fontSize.value), Number(zoom.value) / 100, Number(position.value) / 100);
    const update = () => {
      $('#char-count').textContent = String(title.value.length);
      $('#font-value').textContent = `${fontSize.value} px`;
      $('#zoom-value').textContent = `${zoom.value}%`;
      $('#position-value').textContent = `${position.value}%`;
      saveButtons.forEach((button) => { button.disabled = !photo || !title.value.trim(); });
      render();
    };
    input.addEventListener('change', () => choosePhoto(input.files?.[0], update));
    ['dragenter', 'dragover'].forEach((eventName) => upload.addEventListener(eventName, (event) => { event.preventDefault(); upload.classList.add('drag'); }));
    ['dragleave', 'drop'].forEach((eventName) => upload.addEventListener(eventName, (event) => { event.preventDefault(); upload.classList.remove('drag'); }));
    upload.addEventListener('drop', (event) => choosePhoto(event.dataTransfer.files?.[0], update));
    [title, label, fontSize, zoom, position].forEach((inputNode) => inputNode.addEventListener('input', update));
    saveButtons.forEach((button) => button.addEventListener('click', () => savePng(canvas, title.value)));
    $('#clear-form').addEventListener('click', () => {
      if (photoUrl) URL.revokeObjectURL(photoUrl);
      photoUrl = ''; photo = null; input.value = ''; title.value = ''; label.value = 'NOTÍCIA'; fontSize.value = '72'; zoom.value = '100'; position.value = '50'; $('#file-meta').textContent = 'Nenhuma foto selecionada.'; update();
    });
    $('#admin-logout').addEventListener('click', async () => { await api('admin/logout', 'POST').catch(() => {}); adminSession = false; login(); });
    document.fonts?.ready.then(update);
    update();
  }

  function choosePhoto(file, onChange) {
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) { toast('Escolha um PNG, JPG ou WebP de até 10 MB.'); return; }
    const nextUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => { if (photoUrl) URL.revokeObjectURL(photoUrl); photoUrl = nextUrl; photo = image; $('#file-meta').textContent = `${file.name} · ${(file.size / 1024 / 1024).toFixed(1)} MB`; onChange(); };
    image.onerror = () => { URL.revokeObjectURL(nextUrl); toast('Não consegui abrir essa imagem.'); };
    image.src = nextUrl;
  }

  function wrapText(ctx, text, maxWidth) {
    const lines = [];
    String(text).split('\n').forEach((paragraph) => {
      const words = paragraph.split(/\s+/).filter(Boolean);
      if (!words.length) { lines.push(''); return; }
      let line = '';
      words.forEach((word) => {
        const next = line ? `${line} ${word}` : word;
        if (line && ctx.measureText(next).width > maxWidth) { lines.push(line); line = word; }
        else line = next;
      });
      if (line) lines.push(line);
    });
    return lines;
  }

  function drawPost(ctx, canvas, image, headline, category, preferredFontSize, zoom, verticalPosition) {
    const width = canvas.width, height = canvas.height;
    ctx.clearRect(0, 0, width, height);
    if (image) {
      const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight) * zoom;
      const drawWidth = image.naturalWidth * scale, drawHeight = image.naturalHeight * scale;
      const x = (width - drawWidth) / 2;
      const y = (height - drawHeight) * verticalPosition;
      ctx.drawImage(image, x, y, drawWidth, drawHeight);
      const shade = ctx.createLinearGradient(0, height * .35, 0, height);
      shade.addColorStop(0, 'rgba(0,0,0,0)');
      shade.addColorStop(.36, 'rgba(0,0,0,.10)');
      shade.addColorStop(.63, 'rgba(0,0,0,.72)');
      shade.addColorStop(1, 'rgba(0,0,0,.94)');
      ctx.fillStyle = shade;
      ctx.fillRect(0, 0, width, height);
    } else {
      const base = ctx.createLinearGradient(0, 0, width, height);
      base.addColorStop(0, '#262039'); base.addColorStop(.5, '#17151e'); base.addColorStop(1, '#090909');
      ctx.fillStyle = base; ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(0, height * .58, width, height * .42);
    }

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.3)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 3;
    ctx.fillStyle = '#fff'; ctx.font = '700 30px Poppins, Arial, sans-serif';
    ctx.fillText('bloxter', 72, 92);
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,.82)'; ctx.font = '500 19px Poppins, Arial, sans-serif';
    ctx.fillText('NOTÍCIAS', 72, 124);

    const pill = (category || 'NOTÍCIA').toLocaleUpperCase('pt-BR').slice(0, 28);
    ctx.font = '700 18px Poppins, Arial, sans-serif';
    const pillWidth = ctx.measureText(pill).width + 36;
    const pillY = height - 390;
    roundedRect(ctx, 72, pillY, pillWidth, 42, 21);
    ctx.fillStyle = 'rgba(255,255,255,.16)'; ctx.fill();
    ctx.fillStyle = '#fff'; ctx.textBaseline = 'middle'; ctx.fillText(pill, 90, pillY + 21); ctx.textBaseline = 'alphabetic';

    const text = headline || 'Sua notícia aparece aqui';
    let fontSize = preferredFontSize, lines = [];
    while (fontSize >= 24) {
      ctx.font = `700 ${fontSize}px Poppins, Arial, sans-serif`;
      lines = wrapText(ctx, text, width - 144);
      if (lines.length <= 6 && lines.length * fontSize * 1.14 <= 250) break;
      fontSize -= 1;
    }
    if (lines.length > 6) {
      lines = lines.slice(0, 6);
      ctx.font = `700 ${fontSize}px Poppins, Arial, sans-serif`;
      let last = lines[5];
      while (ctx.measureText(`${last}…`).width > width - 144 && last.length) last = last.slice(0, -1);
      lines[5] = `${last.trimEnd()}…`;
    }
    ctx.font = `700 ${fontSize}px Poppins, Arial, sans-serif`;
    ctx.fillStyle = '#fff'; ctx.textBaseline = 'top';
    const lineHeight = fontSize * 1.14;
    const titleY = height - 325;
    lines.forEach((line, index) => ctx.fillText(line, 72, titleY + index * lineHeight, width - 144));
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = 'rgba(255,255,255,.78)'; ctx.font = '500 19px Poppins, Arial, sans-serif';
    ctx.fillText('bloxter.sbs', 72, height - 54);
    ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.font = '400 17px Poppins, Arial, sans-serif';
    ctx.textAlign = 'right'; ctx.fillText('ACOMPANHE', width - 72, height - 54); ctx.textAlign = 'left';
  }

  function roundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath(); ctx.moveTo(x + radius, y); ctx.lineTo(x + width - radius, y); ctx.quadraticCurveTo(x + width, y, x + width, y + radius); ctx.lineTo(x + width, y + height - radius); ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height); ctx.lineTo(x + radius, y + height); ctx.quadraticCurveTo(x, y + height, x, y + height - radius); ctx.lineTo(x, y + radius); ctx.quadraticCurveTo(x, y, x + radius, y); ctx.closePath();
  }

  async function savePng(canvas, headline) {
    if (!photo || !headline.trim()) { toast('Adicione uma foto e escreva a notícia.'); return; }
    try {
      const blob = await new Promise((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error('png_export_failed')), 'image/png'));
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const base = headline.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'noticia';
      link.href = url; link.download = `bloxter-${base}.png`; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    } catch { toast('Não foi possível gerar o PNG.'); }
  }

  async function init() {
    try { await api('admin/me'); adminSession = true; editor(); }
    catch { login(); }
  }

  init();
})();
