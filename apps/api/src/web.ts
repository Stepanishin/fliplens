import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { FastifyInstance } from 'fastify';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';

/**
 * Production hardening and single-origin hosting:
 * - security headers with a CSP that allows exactly what the app loads (Google Sign-In, eBay/Google images);
 * - rate limits per device (or IP), tighter on expensive and auth endpoints;
 * - the built PWA (apps/web/dist) served by the API, so the app and /api share one origin (no CORS).
 */

/** Requests per minute per device/IP, by path prefix (first match wins). */
const LIMITS: readonly [prefix: string, perMinute: number][] = [
  ['/api/auth/', 10],
  ['/api/identify', 20],
  ['/api/valuation', 30],
  ['/api/category', 60],
  ['/api/billing/', 20],
  ['/api/listing', 20],
  ['/api/', 300],
];

export async function registerSecurity(app: FastifyInstance): Promise<void> {
  // One canonical origin: sign-in, localStorage and the installed PWA are all per origin. www.x -> x, path kept.
  app.addHook('onRequest', async (req, reply) => {
    const host = req.host;
    if (host.startsWith('www.')) return reply.redirect(`https://${host.slice(4)}${req.url}`, 308);
  });

  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", 'https://accounts.google.com/gsi/client'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://accounts.google.com/gsi/style'],
        frameSrc: ['https://accounts.google.com'],
        connectSrc: ["'self'", 'https://accounts.google.com/gsi/'],
        // Comparable listing photos (eBay), Google profile pictures, local photo previews.
        imgSrc: ["'self'", 'data:', 'blob:', 'https://i.ebayimg.com', 'https://*.ebayimg.com', 'https://*.googleusercontent.com'],
        mediaSrc: ["'self'", 'blob:'],
        workerSrc: ["'self'"],
        manifestSrc: ["'self'"],
        fontSrc: ["'self'", 'data:'],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
      },
    },
    // Google Sign-In uses a popup that must be able to talk back to this window.
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
    crossOriginEmbedderPolicy: false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    hsts: { maxAge: 60 * 60 * 24 * 365, includeSubDomains: true },
  });
  // Camera for photos and barcode scanning, nothing else.
  app.addHook('onSend', async (_req, reply) => {
    void reply.header('Permissions-Policy', 'camera=(self), microphone=(), geolocation=(), payment=()');
  });

  await app.register(rateLimit, {
    global: true,
    timeWindow: '1 minute',
    max: (req) => LIMITS.find(([p]) => req.url.startsWith(p))?.[1] ?? 600,
    keyGenerator: (req) => {
      const device = req.headers['x-device-id'];
      const prefix = LIMITS.find(([p]) => req.url.startsWith(p))?.[0] ?? 'web';
      return `${prefix}|${typeof device === 'string' && device.length <= 64 ? device : req.ip}`;
    },
    // Stripe retries webhooks; they are verified by signature, never throttle them.
    allowList: (req) => req.url.startsWith('/api/stripe/webhook') || req.url === '/api/health',
    errorResponseBuilder: (_req, ctx) => ({ statusCode: 429, error: 'rate_limited', message: `Too many requests, try again in ${Math.ceil(ctx.ttl / 1000)} s.` }),
  });
}

/** Serves the built PWA with SPA fallback; returns false when no build is present (dev uses the Vite server). */
export async function registerWebApp(app: FastifyInstance, distDir: string): Promise<boolean> {
  const root = resolve(distDir);
  if (!existsSync(resolve(root, 'index.html'))) return false;
  await app.register(fastifyStatic, {
    root,
    wildcard: false,
    // "/" goes to the handler below (per-page meta), as do content pages without ".html" (/pricing -> pricing.html).
    index: false,
    setHeaders: (res, path) => {
      // Hashed assets can be cached forever; the service worker and HTML must always be revalidated.
      if (/\/assets\//.test(path)) void res.header('Cache-Control', 'public, max-age=31536000, immutable');
      else void res.header('Cache-Control', 'no-cache');
    },
  });
  const shell = readFileSync(resolve(root, 'index.html'), 'utf8');
  const pages = new Map<string, string>([
    ['/', shell],
    ['/welcome', withMeta(shell, '/', null)],
    ['/admin', withMeta(shell, '/', null, true)],
    ['/privacy', withMeta(shell, '/privacy', { title: 'Privacy Policy | FlipLens', description: 'How FlipLens handles your data: what is collected, why, how long it is kept, who processes it and your rights under the GDPR.' })],
    ['/terms', withMeta(shell, '/terms', { title: 'Terms of Service | FlipLens', description: 'The terms for using FlipLens, including plans, payments, the 14-day withdrawal right for EU consumers and limits of the estimates.' })],
  ]);
  const notFound = withMeta(shell, null, { title: 'Page not found | FlipLens', description: 'This page does not exist.' }, true);

  app.setNotFoundHandler((req, reply) => {
    if ((req.method !== 'GET' && req.method !== 'HEAD') || req.url.startsWith('/api/')) return reply.code(404).send({ error: 'not_found' });
    const path = req.url.split('?')[0]!;
    // One URL per page: /pricing/ -> /pricing.
    // Always a same-site path ("//host/" must not become a redirect to another site).
    if (path.length > 1 && path.endsWith('/')) return reply.redirect(`/${path.replace(/^\/+|\/+$/g, '')}${req.url.slice(path.length)}`, 301);
    // Generated content pages (apps/web/scripts/site.ts). Strict pattern: no dots, so no path traversal.
    if (/^\/[a-z0-9-]+(\/[a-z0-9-]+)*$/.test(path) && existsSync(resolve(root, `${path.slice(1)}.html`))) {
      return reply.header('Cache-Control', 'no-cache').type('text/html; charset=utf-8').sendFile(`${path.slice(1)}.html`);
    }
    const html = pages.get(path);
    // Unknown paths still load the app (it handles them), but answer 404 so search engines do not index them.
    return reply.code(html ? 200 : 404).header('Cache-Control', 'no-cache').type('text/html; charset=utf-8').send(html ?? notFound);
  });
  return true;
}

/**
 * index.html carries the start page's title, description, canonical and Open Graph tags (see apps/web/scripts/site.ts).
 * Other app URLs get their own title and canonical; `noindex` keeps app-only and missing pages out of search results.
 */
function withMeta(html: string, canonical: string | null, meta: { title: string; description: string } | null, noindex = false): string {
  let out = html;
  if (meta) {
    const t = escapeHtml(meta.title);
    const d = escapeHtml(meta.description);
    out = out
      .replace(/<title>[^<]*<\/title>/, `<title>${t}</title>`)
      .replace(/(<meta name="description" content=")[^"]*(")/, `$1${d}$2`)
      .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${t}$2`)
      .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${d}$2`)
      .replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${t}$2`)
      .replace(/(<meta name="twitter:description" content=")[^"]*(")/, `$1${d}$2`);
  }
  if (canonical) {
    const url = `https://fliplens.eu${canonical}`;
    out = out.replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${url}$2`).replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${url}$2`);
  } else out = out.replace(/\s*<link rel="canonical" href="[^"]*">/, '');
  if (noindex) out = out.replace('</head>', '  <meta name="robots" content="noindex">\n  </head>');
  return out;
}

const escapeHtml = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
