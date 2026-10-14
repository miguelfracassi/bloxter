import { next } from '@vercel/functions';

export const config = {
  runtime: 'nodejs',
  matcher: ['/((?!api/|maintenance(?:/|$)|developers-services(?:/|$)|administracao(?:/|$)|verificacao(?:\.html)?$|gerenciador(?:/|$)|.*\.(?:js|css|png|jpe?g|webp|gif|svg|ico|woff2?|mp4|webm|json|txt|xml)$).*)'],
};

export default async function middleware(request) {
  const url = new URL(request.url);
  try {
    const response = await fetch(new URL('/api/site/status', url.origin), {
      headers: { cookie: request.headers.get('cookie') || '' },
      cache: 'no-store',
      signal: AbortSignal.timeout(4000),
    });
    if (response.ok) {
      const data = await response.json();
      if (data.maintenance?.enabled) {
        const target = new URL('/maintenance', url.origin);
        if (url.pathname !== target.pathname) return Response.redirect(target, 307);
      }
    }
  } catch (error) {
    // Falha no status do banco não deve derrubar as páginas públicas.
  }
  return next();
}
