// Restaura um backup (.jsonl.gz feito por backup-banco.js) em um banco Postgres novo ou vazio.
// Uso:
//   Windows (PowerShell):  $env:DATABASE_URL="postgresql://...novo..."; node scripts/restaurar-backup.js backups/ARQUIVO.jsonl.gz
//   Mac/Linux:             DATABASE_URL="postgresql://..." node scripts/restaurar-backup.js backups/ARQUIVO.jsonl.gz
// Cria as tabelas sozinho. Linhas que já existem são ignoradas (seguro rodar mais de uma vez).
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const readline = require('node:readline');
const { Pool } = require('pg');

const URL = process.env.DATABASE_URL;
const FILE = process.argv[2];
if (!URL || !FILE) { console.error('Use: DATABASE_URL=... node scripts/restaurar-backup.js backups/ARQUIVO.jsonl.gz'); process.exit(1); }
const pool = new Pool({ connectionString: URL, ssl: /localhost|127\.0\.0\.1/.test(URL) ? false : { rejectUnauthorized: false }, max: 2 });
const q = (s) => `"${String(s).replace(/"/g, '""')}"`;
const dec = (_k, v) => (v && typeof v === 'object' && typeof v.__b64 === 'string' ? Buffer.from(v.__b64, 'base64') : v);

async function main() {
  const { ensureSchema } = require(path.join(__dirname, '..', 'lib', 'db.js'));
  console.log('Criando tabelas...');
  await ensureSchema();

  const types = {}; // tabela -> { coluna: data_type }
  const colsOf = async (t) => {
    if (!types[t]) {
      types[t] = {};
      for (const r of (await pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name=$1`, [t])).rows) types[t][r.column_name] = r.data_type;
    }
    return types[t];
  };
  const counts = {}; const fails = {}; const lines = [];
  const rl = readline.createInterface({ input: fs.createReadStream(FILE).pipe(zlib.createGunzip()), crlfDelay: Infinity });
  // 1ª passada em memória só do que cabe: lemos linha a linha e inserimos; tabelas dependentes podem falhar por chave
  // estrangeira, então guardamos essas linhas e tentamos de novo no fim.
  const retry = [];
  const insert = async (t, row) => {
    const cols = await colsOf(t);
    const keys = Object.keys(row).filter((c) => cols[c]);
    const vals = keys.map((c) => {
      const v = row[c];
      return v !== null && typeof v === 'object' && !Buffer.isBuffer(v) && /json/.test(cols[c]) ? JSON.stringify(v) : v;
    });
    await pool.query(`INSERT INTO ${q(t)} (${keys.map(q).join(',')}) VALUES (${keys.map((_, i) => '$' + (i + 1)).join(',')}) ON CONFLICT DO NOTHING`, vals);
  };
  let meta = null; let ended = false;
  for await (const line of rl) {
    if (!line.trim()) continue;
    const o = JSON.parse(line, dec);
    if (o.meta) { meta = o.meta; console.log(`Backup de ${meta.created}`); continue; }
    if (o.end) { ended = true; continue; }
    if (!o.t || t_skip(o.t)) continue;
    try { await insert(o.t, o.r); counts[o.t] = (counts[o.t] || 0) + 1; }
    catch (e) { retry.push(o); }
  }
  function t_skip(t) { return t === 'schema_meta'; }
  for (let pass = 0; pass < 4 && retry.length; pass++) {
    const left = retry.splice(0);
    for (const o of left) {
      try { await insert(o.t, o.r); counts[o.t] = (counts[o.t] || 0) + 1; }
      catch (e) { retry.push(o); fails[o.t] = String(e.message).slice(0, 120); }
    }
  }
  for (const [t, n] of Object.entries(counts)) console.log(`- ${t}: ${n}`);
  for (const o of retry) console.log(`! ${o.t}: linha não restaurada (${fails[o.t]})`);
  // contadores (SERIAL)
  for (const t of Object.keys(counts)) {
    const seq = (await pool.query(`SELECT pg_get_serial_sequence($1, 'id') AS s`, [`public.${q(t)}`]).catch(() => ({ rows: [] }))).rows[0];
    if (seq && seq.s) await pool.query(`SELECT setval($1, GREATEST((SELECT COALESCE(MAX(id), 0) FROM ${q(t)}), 1))`, [seq.s]);
  }
  console.log(ended ? '\nRestauração concluída.' : '\nAVISO: o arquivo parece incompleto (sem marca de fim).');
  await pool.end();
}
main().catch((e) => { console.error('\nFalhou:', e.message); process.exit(1); });
