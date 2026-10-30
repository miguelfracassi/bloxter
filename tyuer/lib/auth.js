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

// Contas já conectadas neste navegador (cookie assinado, HttpOnly). Só quem fez login de verdade entra na lista.
const ACCOUNTS_COOKIE = 'bx_accounts';

function getLinked(req) {
  const token = parseCookies(req)[ACCOUNTS_COOKIE];
  if (!token) return [];
  try {
    const ids = jwt.verify(token, secret()).ids;
    return Array.isArray(ids) ? ids.filter((x) => Number.isInteger(x)).slice(0, 10) : [];
  } catch {
    return [];
  }
}

function linkedCookie(ids) {
  if (!ids.length) return `${ACCOUNTS_COOKIE}=; ${cookieFlags()}Max-Age=0`;
  const token = jwt.sign({ ids }, secret(), { expiresIn: MAX_AGE });
  return `${ACCOUNTS_COOKIE}=${token}; ${cookieFlags()}Max-Age=${MAX_AGE}`;
}

function setLinked(res, ids) {
  const prev = res.getHeader('Set-Cookie');
  const list = Array.isArray(prev) ? prev : prev ? [prev] : [];
  res.setHeader('Set-Cookie', [...list, linkedCookie(ids)]);
}

function setSession(res, uid, req) {
  const token = jwt.sign({ uid }, secret(), { expiresIn: MAX_AGE });
  const cookies = [`${COOKIE}=${token}; ${cookieFlags()}Max-Age=${MAX_AGE}`];
  if (req) {
    const ids = [...getLinked(req).filter((x) => x !== uid), uid].slice(-10);
    cookies.push(linkedCookie(ids));
  }
  res.setHeader('Set-Cookie', cookies);
}

function clearSession(res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; ${cookieFlags()}Max-Age=0`);
}

// ---------- sessão de admin (/verificacao) ----------
const ADMIN_COOKIE = 'bx_admin';
const ADMIN_AGE = 60 * 60 * 12; // 12 horas
const PREVIEW_COOKIE = 'bx_admin_preview';
const PREVIEW_AGE = 60 * 60; // 1 hora

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
  res.setHeader('Set-Cookie', [
    `${ADMIN_COOKIE}=; ${cookieFlags()}Max-Age=0`,
    `${PREVIEW_COOKIE}=; ${cookieFlags()}Max-Age=0`,
  ]);
}

function setAdminPreview(res) {
  const token = jwt.sign({ admin: true, preview: true }, secret(), { expiresIn: PREVIEW_AGE });
  res.setHeader('Set-Cookie', `${PREVIEW_COOKIE}=${token}; ${cookieFlags()}Max-Age=${PREVIEW_AGE}`);
}

function clearAdminPreview(res) {
  res.setHeader('Set-Cookie', `${PREVIEW_COOKIE}=; ${cookieFlags()}Max-Age=0`);
}

function isAdminPreview(req) {
  const token = parseCookies(req)[PREVIEW_COOKIE];
  if (!token) return false;
  try {
    const data = jwt.verify(token, secret());
    return data.admin === true && data.preview === true && isAdmin(req);
  } catch {
    return false;
  }
}

module.exports = { getUserId, getLinked, setLinked, setSession, clearSession, adminPassword, isAdmin, setAdmin, clearAdmin, setAdminPreview, clearAdminPreview, isAdminPreview };
