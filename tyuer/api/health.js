// Diagnóstico: abra /api/health no navegador.
// Mostra variáveis, módulos e testa o banco de verdade (nunca mostra senhas).
const scrub = (e) =>
  `${e && e.name ? e.name + ': ' : ''}${String((e && e.message) || e).replace(/postgres(ql)?:\/\/\S+/gi, '[url]').slice(0, 300)}${e && e.code ? ' (code ' + e.code + ')' : ''}`;

module.exports = async (req, res) => {
  const out = {
    ok: true,
    node: process.version,
    recebido: { method: req.method, url: req.url },
    env: {
      DATABASE_URL: !!process.env.DATABASE_URL,
      JWT_SECRET: !!process.env.JWT_SECRET,
      JWT_SECRET_len_ok: (process.env.JWT_SECRET || '').length >= 16,
    },
    modules: {},
    db: {},
  };
  for (const m of ['bcryptjs', 'jsonwebtoken', '@neondatabase/serverless', '../lib/db', '../lib/auth']) {
    try { require(m); out.modules[m] = 'ok'; }
    catch (e) { out.ok = false; out.modules[m] = scrub(e); }
  }
  if (!out.env.DATABASE_URL) {
    out.ok = false;
    out.db.erro = 'DATABASE_URL não existe neste deploy';
  } else if (out.modules['../lib/db'] === 'ok') {
    try {
      const { getSql, ensureSchema } = require('../lib/db');
      const s = getSql();
      await s`SELECT 1 AS ok`;
      out.db.conexao = 'ok';
      await ensureSchema();
      out.db.tabelas = 'ok';
      const rows = await s`SELECT count(*)::int AS n FROM users`;
      out.db.usuarios = rows[0].n;
    } catch (e) {
      out.ok = false;
      out.db.erro = scrub(e);
    }
  }
  try {
    const bcrypt = require('bcryptjs');
    await bcrypt.hash('teste', 4);
    out.bcrypt = 'ok';
  } catch (e) { out.ok = false; out.bcrypt = scrub(e); }
  res.status(200).json(out);
};
