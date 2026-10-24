/* Bloxter — service worker.
   Deixa o site instalável e mostra uma tela própria (/offline) quando estiver sem internet.
   Regras: a API (/api) NUNCA passa por aqui nem fica salva. As páginas dependem da API,
   então não são guardadas: sem conexão, a navegação cai na tela offline. Arquivos
   estáticos (css, js, imagens) usam "rede primeiro" e o cache só entra se a rede falhar. */
const VERSION = 'v1';
const STATIC_CACHE = `bloxter-static-${VERSION}`;
const RUNTIME_CACHE = `bloxter-runtime-${VERSION}`;
const RUNTIME_LIMIT = 60;
const PRECACHE = ['/offline', '/style.css', '/js/common.js', '/js/pwa.js', '/icon.png', '/icon-192.png', '/symbol.png', '/logo.png'];
const ASSET_RE = /\.(?:css|js|png|jpe?g|webp|gif|svg|ico|woff2?|webmanifest)$/i;

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(STATIC_CACHE);
    await Promise.all(PRECACHE.map((url) => cache.add(new Request(url, { cache: 'reload' })).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keep = new Set([STATIC_CACHE, RUNTIME_CACHE]);
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith('bloxter-') && !keep.has(k)).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

async function trimRuntime() {
  const cache = await caches.open(RUNTIME_CACHE);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - RUNTIME_LIMIT; i += 1) await cache.delete(keys[i]);
}

async function remember(request, response) {
  if (!response || !response.ok || response.type !== 'basic' || response.redirected) return;
  const cache = await caches.open(RUNTIME_CACHE);
  await cache.put(request, response.clone());
  trimRuntime();
}

async function handlePage(request) {
  try {
    return await fetch(request);
  } catch {
    const offline = await caches.match('/offline');
    return offline || new Response('Sem conexão.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }
}

async function handleAsset(request) {
  try {
    const response = await fetch(request);
    remember(request, response).catch(() => {});
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return Response.error();
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || request.headers.has('range')) return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/') || url.pathname === '/sw.js') return;
  if (request.mode === 'navigate') { event.respondWith(handlePage(request)); return; }
  if (ASSET_RE.test(url.pathname)) event.respondWith(handleAsset(request));
});
