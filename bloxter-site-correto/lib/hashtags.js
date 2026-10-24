// Hashtags do Bloxter.
// Regra única, usada na API (ao publicar e no backfill). O front (public/js/common.js, função fmt)
// usa a mesma regra para transformar #tags em links.
//
//  - começa com #, tem 2 a 30 letras/números/_ (aceita acentos e outros alfabetos)
//  - não vale no meio de uma palavra (ex.: "a#b") nem logo depois de "&" ou "#"
//  - texto dentro de links (http/https) é ignorado
//  - só números (ex.: #1, #2026) não conta como hashtag
//  - a tag é guardada em minúsculas e sem acentos: #AçãO e #acao são a mesma hashtag
//  - no máximo 10 hashtags diferentes por post

const TAG_RE = /(^|[^\p{L}\p{N}_&#])#([\p{L}\p{N}_]{2,30})(?![\p{L}\p{N}_])/gu;
const MAX_TAGS_PER_POST = 10;

function normalizeTag(raw) {
  return String(raw || '')
    .replace(/^#+/, '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

function isValidTag(tag) {
  return /^[\p{L}\p{N}_]{2,30}$/u.test(tag) && !/^\d+$/.test(tag);
}

function extractHashtags(text) {
  const found = [];
  // Links não contam: o "#trecho" de https://site.com/pagina#trecho não é hashtag.
  const body = String(text || '').replace(/https?:\/\/\S+/gi, ' ');
  TAG_RE.lastIndex = 0;
  let m;
  while ((m = TAG_RE.exec(body)) !== null) {
    const tag = normalizeTag(m[2]);
    if (!isValidTag(tag) || found.includes(tag)) continue;
    found.push(tag);
    if (found.length >= MAX_TAGS_PER_POST) break;
  }
  return found;
}

module.exports = { extractHashtags, normalizeTag, isValidTag, MAX_TAGS_PER_POST };
