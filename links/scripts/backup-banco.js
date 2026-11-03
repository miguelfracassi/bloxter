// Faz backup de TODO o banco (contas, posts, mensagens, configurações, imagens...) em um arquivo .jsonl.gz.
// Uso (dentro da pasta do projeto, depois de "npm install"):
//   Windows (PowerShell):  $env:DATABASE_URL="postgresql://...supabase..."; node scripts/backup-banco.js
//   Mac/Linux:             DATABASE_URL="postgresql://..." node scripts/backup-banco.js
// Gera: backups/bloxter-AAAA-MM-DD-HHMM.jsonl.gz   (guarde uma cópia fora do computador: Drive, pen drive...)
// Só lê o banco; nada é alterado ou apagado.
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const { Pool } = require('pg');

const URL = process.env.DATABASE_URL || process.env.SOURCE_URL;
if (!URL) { console.error('Defina DATABASE_URL (o banco do site).'); process.exit(1); }
const pool = new Pool({ connectionString: URL, ssl: /localhost|127\.0\.0\.1/.test(URL) ? false : { rejectUnauthorized: false }, max: 2 });
const q = (s) => `"${String(s).replace(/"/g, '""')}"`;
const enc = (_k, v) => (v && v.type === 'Buffer' && Array.isArray(v.data) ? { __b64: Buffer.from(v.data).toString('base64') } : v);

async function main() {
  const dir = process.env.BACKUP_DIR || path.join(process.cwd(), 'backups');
  fs.mkdirSync(dir, { recursive: true });
  const d = new Date();
  const p2 = (n) => String(n).padStart(2, '0');
  let file = path.join(dir, `bloxter-${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}-${p2(d.getHours())}${p2(d.getMinutes())}.jsonl.gz`);
  const gz = zlib.createGzip({ level: 6 });
  const out = fs.createWriteStream(file);
  gz.pipe(out);
  const write = (obj) => new Promise((ok) => { if (gz.write(JSON.stringify(obj, enc) + '\n')) ok(); else gz.once('drain', ok); });

  const tables = (await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY 1`)).rows.map((r) => r.table_name);
  await write({ meta: { app: 'bloxter', created: d.toISOString(), tables } });
  let totalRows = 0;
  for (const t of tables) {
    const hasId = (await pool.query(`SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 AND column_name='id'`, [t])).rowCount > 0;
    let n = 0; let lastId = 0;
    for (;;) {
      const res = hasId
        ? await pool.query(`SELECT * FROM ${q(t)} WHERE id > $1 ORDER BY id LIMIT 100`, [lastId])
        : await pool.query(`SELECT * FROM ${q(t)} OFFSET $1 LIMIT 100`, [n]);
      if (!res.rows.length) break;
      for (const row of res.rows) { await write({ t, r: row }); n++; if (hasId) lastId = Math.max(lastId, Number(row.id) || 0); }
      if (res.rows.length < 100) break;
    }
    totalRows += n;
    console.log(`- ${t}: ${n}`);
  }
  await write({ end: true, rows: totalRows });
  await new Promise((ok) => { out.on('finish', ok); gz.end(); });
  await pool.end();
  let finalFile = file;
  if (process.env.BACKUP_PASSWORD) {
    // Criptografa (AES-256-GCM) e apaga a versão sem senha. Formato: "BXB1" + salt(16) + iv(12) + dados + tag(16).
    const crypto = require('node:crypto');
    const salt = crypto.randomBytes(16); const iv = crypto.randomBytes(12);
    const key = crypto.scryptSync(process.env.BACKUP_PASSWORD, salt, 32);
    const c = crypto.createCipheriv('aes-256-gcm', key, iv);
    finalFile = file + '.enc';
    const w = fs.createWriteStream(finalFile);
    w.write(Buffer.concat([Buffer.from('BXB1'), salt, iv]));
    await new Promise((ok, bad) => { const r = fs.createReadStream(file); r.on('error', bad); w.on('error', bad); r.pipe(c).on('data', (b) => w.write(b)).on('end', () => { w.end(Buffer.concat([c.getAuthTag()]), ok); }); });
    fs.unlinkSync(file);
  }
  file = finalFile;
  console.log(`\nBackup pronto (${totalRows} linhas): ${file}\nTamanho: ${(fs.statSync(file).size / 1048576).toFixed(1)} MB`);
}
main().catch((e) => { console.error('\nFalhou:', e.message); process.exit(1); });
