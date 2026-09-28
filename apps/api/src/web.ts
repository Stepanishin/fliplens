import { existsSync } from 'node:fs';
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
  ['/api/', 300],
];

export async function registerSecurity(app: FastifyInstance): Promise<void> {
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
    setHeaders: (res, path) => {
      // Hashed assets can be cached forever; the service worker and HTML must always be revalidated.
      if (/\/assets\//.test(path)) void res.header('Cache-Control', 'public, max-age=31536000, immutable');
      else void res.header('Cache-Control', 'no-cache');
    },
  });
  app.setNotFoundHandler((req, reply) => {
    if (req.method === 'GET' && !req.url.startsWith('/api/')) return reply.header('Cache-Control', 'no-cache').sendFile('index.html');
    return reply.code(404).send({ error: 'not_found' });
  });
  return true;
}
