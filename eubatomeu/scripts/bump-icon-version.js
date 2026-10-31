// Uso: node scripts/bump-icon-version.js
// Rode depois de trocar os arquivos de ícone (public/icon*.png, apple-touch-icon.png) e faça o deploy.
// Troca o "?v=" de todos os ícones no site/manifest e muda a versão do service worker, para que
// quem já instalou o app baixe o ícone novo (Android/Chrome atualizam sozinhos em até alguns dias).
const fs = require('fs'), path = require('path');
const pub = path.join(__dirname, '..', 'public');
const v = new Date().toISOString().slice(0, 10).replace(/-/g, '') + String(Date.now()).slice(-4);
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
let n = 0;
for (const f of walk(pub).filter((x) => /\.(html|js|webmanifest)$/.test(x))) {
  const t = fs.readFileSync(f, 'utf8');
  let r = t.replace(/((?:icon|icon-192|icon-512|icon-maskable-512|apple-touch-icon)\.png)\?v=\d+/g, `$1?v=${v}`);
  if (path.basename(f) === 'sw.js') r = r.replace(/const VERSION = '[^']*';/, `const VERSION = 'v-icons-${v}';`);
  if (r !== t) { fs.writeFileSync(f, r); n++; }
}
console.log(`Versão dos ícones: ${v} (${n} arquivos atualizados)`);
