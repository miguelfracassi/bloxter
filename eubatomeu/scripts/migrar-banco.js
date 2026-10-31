// Copia TODOS os dados de um Postgres (ex.: Neon) para outro (ex.: Supabase).
// Uso (no seu computador, dentro da pasta do projeto, depois de "npm install"):
//   Windows (PowerShell):
//     $env:SOURCE_URL="postgresql://...neon..."; $env:TARGET_URL="postgresql://...supabase...:6543/postgres"; node scripts/migrar-banco.js
//   Mac/Linux:
//     SOURCE_URL="postgresql://...neon..." TARGET_URL="postgresql://...supabase...:6543/postgres" node scripts/migrar-banco.js
// É seguro rodar mais de uma vez: linhas já copiadas são ignoradas. Nada é apagado no banco de origem.
const path = require('node:path');
const { Pool } = require('pg');

const SOURCE_URL = process.env.SOURCE_URL;
const TARGET_URL = process.env.TARGET_URL;
if (!SOURCE_URL || !TARGET_URL) {
  console.error('Defina SOURCE_URL (banco antigo) e TARGET_URL (banco novo).');
  process.exit(1);
}
const mk = (url) => new Pool({ connectionString: url, ssl: /localhost|127\.0\.0\.1/.test(url) ? false : { rejectUnauthorized: false }, max: 2 });
const q = (s) => `"${String(s).replace(/"/g, '""')}"`;

async function main() {
  // 1) Cria as tabelas no banco novo usando o próprio código do site.
  process.env.DATABASE_URL = TARGET_URL;
  const { ensureSchema } = require(path.join(__dirname, '..', 'lib', 'db.js'));
  console.log('Criando tabelas no banco novo...');
  await ensureSchema();

  const src = mk(SOURCE_URL);
  const dst = mk(TARGET_URL);
  try {
    // 2) Descobre as tabelas e a ordem (tabelas "pai" antes das que dependem delas).
    const tables = (await src.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`)).rows.map((r) => r.table_name)
      .filter((t) => t !== 'schema_meta');
    const deps = new Map(tables.map((t) => [t, new Set()]));
    const fks = (await src.query(`
      SELECT c.conrelid::regclass::text AS child, c.confrelid::regclass::text AS parent
      FROM pg_constraint c WHERE c.contype = 'f' AND c.connamespace = 'public'::regnamespace`)).rows;
    for (const { child, parent } of fks) {
      const ch = child.replace(/^public\./, '').replace(/"/g, '');
      const pa = parent.replace(/^public\./, '').replace(/"/g, '');
      if (ch !== pa && deps.has(ch) && deps.has(pa)) deps.get(ch).add(pa);
    }
    const order = [];
    const done = new Set();
    while (order.length < tables.length) {
      const next = tables.filter((t) => !done.has(t) && [...deps.get(t)].every((d) => done.has(d)));
      if (!next.length) { for (const t of tables) if (!done.has(t)) { order.push(t); done.add(t); } break; }
      for (const t of next) { order.push(t); done.add(t); }
    }

    // 3) Copia tabela por tabela.
    for (const t of order) {
      const dstCols = new Set((await dst.query(`SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1`, [t])).rows.map((r) => r.column_name));
      if (!dstCols.size) { console.log(`- ${t}: não existe no banco novo, pulada`); continue; }
      const total = Number((await src.query(`SELECT count(*) AS n FROM ${q(t)}`)).rows[0].n);
      let copied = 0;
      let failed = 0;
      const hasId = (await src.query(`SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 AND column_name='id'`, [t])).rowCount > 0;
      let lastId = 0;
      for (;;) {
        // Lê em blocos pequenos (as imagens ficam dentro do banco e são grandes).
        const res = hasId
          ? await src.query(`SELECT * FROM ${q(t)} WHERE id > $1 ORDER BY id LIMIT 100`, [lastId])
          : await src.query(`SELECT * FROM ${q(t)} OFFSET $1 LIMIT 100`, [copied + failed]);
        if (!res.rows.length) break;
        for (const row of res.rows) {
          const cols = Object.keys(row).filter((c) => dstCols.has(c));
          const vals = cols.map((c) => row[c]);
          try {
            await dst.query(`INSERT INTO ${q(t)} (${cols.map(q).join(',')}) VALUES (${cols.map((_, i) => '$' + (i + 1)).join(',')}) ON CONFLICT DO NOTHING`, vals);
            copied++;
          } catch (e) {
            failed++;
            if (failed <= 3) console.log(`  ! ${t}: ${String(e.message).slice(0, 140)}`);
          }
          if (hasId) lastId = Math.max(lastId, Number(row.id) || 0);
        }
        if (res.rows.length < 100) break;
      }
      console.log(`- ${t}: ${copied}/${total} copiadas${failed ? `, ${failed} com erro` : ''}`);
    }

    // 4) Ajusta os contadores (SERIAL) para os novos cadastros não repetirem ids.
    for (const t of order) {
      const seq = (await dst.query(`SELECT pg_get_serial_sequence($1, 'id') AS s`, [`public.${q(t)}`]).catch(() => ({ rows: [] }))).rows[0];
      if (seq && seq.s) await dst.query(`SELECT setval($1, GREATEST((SELECT COALESCE(MAX(id), 0) FROM ${q(t)}), 1))`, [seq.s]);
    }
    console.log('\nPronto! Confira as contas no banco novo e depois troque a DATABASE_URL na Vercel.');
  } finally {
    await src.end().catch(() => {});
    await dst.end().catch(() => {});
  }
}

main().catch((e) => { console.error('\nFalhou:', e.message); process.exit(1); });
