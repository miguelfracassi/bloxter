const jwt = require('jsonwebtoken');

const COOKIE = 'bx_session';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 dias

function secret() {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 16) throw new Error('JWT_SECRET não configurada (mínimo 16 caracteres)');
  return s;
}

function parseCookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach((part) => {
    const i = part.indexOf('=');
    if (i > -1) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  });
  return out;
}

function getUserId(req) {
  const token = parseCookies(req)[COOKIE];
  if (!token) return null;
  try {
    const data = jwt.verify(token, secret());
    return data.uid || null;
  } catch {
    return null;
  }
}

function cookieFlags() {
  return `Path=/; HttpOnly; SameSite=Lax; ${process.env.NODE_ENV === 'development' ? '' : 'Secure; '}`;
}

function setSession(res, uid) {
  const token = jwt.sign({ uid }, secret(), { expiresIn: MAX_AGE });
  res.setHeader('Set-Cookie', `${COOKIE}=${token}; ${cookieFlags()}Max-Age=${MAX_AGE}`);
}

function clearSession(res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; ${cookieFlags()}Max-Age=0`);
}

// ---------- sessão de admin (/verificacao) ----------
const ADMIN_COOKIE = 'bx_admin';
const ADMIN_AGE = 60 * 60 * 12; // 12 horas

function adminPassword() {
  return String(process.env.ADMIN_PASSWORD || '2015');
}

function isAdmin(req) {
  const token = parseCookies(req)[ADMIN_COOKIE];
  if (!token) return false;
  try {
    return jwt.verify(token, secret()).admin === true;
  } catch {
    return false;
  }
}

function setAdmin(res) {
  const token = jwt.sign({ admin: true }, secret(), { expiresIn: ADMIN_AGE });
  res.setHeader('Set-Cookie', `${ADMIN_COOKIE}=${token}; ${cookieFlags()}Max-Age=${ADMIN_AGE}`);
}

function clearAdmin(res) {
  res.setHeader('Set-Cookie', `${ADMIN_COOKIE}=; ${cookieFlags()}Max-Age=0`);
}

module.exports = { getUserId, setSession, clearSession, adminPassword, isAdmin, setAdmin, clearAdmin };
