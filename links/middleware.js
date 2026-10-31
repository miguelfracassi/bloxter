import { next } from '@vercel/functions';

export const config = {
  runtime: 'nodejs',
  matcher: ['/((?!api/|maintenance(?:/|$)|offline(?:\\.html)?$|developers-services(?:/|$)|administracao(?:/|$)|team(?:/|$)|verificacao(?:\.html)?$|gerenciador(?:/|$)|.*\.(?:js|css|png|jpe?g|webp|gif|svg|ico|woff2?|mp4|webm|json|webmanifest|txt|xml)$).*)'],
};

// Guarda por alguns segundos que o site NÃO está em manutenção, para não chamar a API + banco em toda navegação.
// Em manutenção a resposta depende do cookie (admin pode entrar), então nunca é guardada.
const OK_TTL_MS = 20000;
let okUntil = 0;

export default async function middleware(request) {
  const url = new URL(request.url);
  if (Date.now() < okUntil) return next();
  try {
    const response = await fetch(new URL('/api/site/status', url.origin), {
      headers: { cookie: request.headers.get('cookie') || '' },
      cache: 'no-store',
      signal: AbortSignal.timeout(2500),
    });
    if (response.ok) {
      const data = await response.json();
      if (data.maintenance?.enabled) {
        const target = new URL('/maintenance', url.origin);
        if (url.pathname !== target.pathname) return Response.redirect(target, 307);
      } else {
        okUntil = Date.now() + OK_TTL_MS;
      }
    }
  } catch (error) {
    // Falha no status do banco não deve derrubar as páginas públicas.
  }
  return next();
}
