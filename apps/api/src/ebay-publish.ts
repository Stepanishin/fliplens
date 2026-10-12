import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { deleteEbayAccount, deleteEbayAccountsByEbayUser, getEbayAccount, saveEbayAccount, setEbayPostalCode, type Db } from '@fliplens/db';

/**
 * Publish a listing on eBay in one go (ADR-025). The user connects their eBay seller account once (OAuth, Sell APIs);
 * we keep only an encrypted refresh token. Publishing: photos go straight to eBay Picture Services, then an inventory
 * item, an offer and publishOffer create the live listing. Shipping comes from the seller's own eBay shipping policies;
 * payment and return policies are created with safe defaults when the seller has none.
 */

export interface EbaySellConfig {
  clientId: string;
  clientSecret: string;
  /** eBay redirect URL name (RuName) registered for https://fliplens.eu/api/ebay/callback. */
  ruName: string;
  /** 32 bytes, base64: encrypts refresh tokens and signs the OAuth state. */
  tokenKey: string;
  /** Marketplace Account Deletion: verification token and the public endpoint URL registered with eBay. */
  verificationToken?: string | undefined;
  deletionEndpoint?: string | undefined;
  sandbox?: boolean;
  /** Fills required item specifics from the listing text (cheap text model); optional. */
  openaiKey?: string | undefined;
  textModel?: string | undefined;
}

export function ebaySellConfigFromEnv(env: NodeJS.ProcessEnv): EbaySellConfig | undefined {
  const { EBAY_CLIENT_ID, EBAY_CLIENT_SECRET, EBAY_RUNAME, EBAY_TOKEN_KEY } = env;
  if (!EBAY_CLIENT_ID || !EBAY_CLIENT_SECRET || !EBAY_RUNAME || !EBAY_TOKEN_KEY) return undefined;
  const appUrl = (env.APP_URL || 'https://fliplens.eu').replace(/\/+$/, '');
  return {
    clientId: EBAY_CLIENT_ID,
    clientSecret: EBAY_CLIENT_SECRET,
    ruName: EBAY_RUNAME,
    tokenKey: EBAY_TOKEN_KEY,
    verificationToken: env.EBAY_VERIFICATION_TOKEN,
    deletionEndpoint: `${appUrl}/api/ebay/account-deletion`,
    sandbox: env.EBAY_ENV === 'sandbox',
    openaiKey: env.OPENAI_API_KEY,
    textModel: env.OPENAI_TEXT_MODEL || 'gpt-6-luna',
  };
}

const SCOPES = [
  'https://api.ebay.com/oauth/api_scope',
  'https://api.ebay.com/oauth/api_scope/sell.inventory',
  'https://api.ebay.com/oauth/api_scope/sell.account',
  'https://api.ebay.com/oauth/api_scope/commerce.identity.readonly',
];

/** eBay sites we publish to: language of the listing and its currency. */
export const PUBLISH_MARKETS = {
  EBAY_DE: { language: 'de-DE', currency: 'EUR', domain: 'www.ebay.de' },
  EBAY_IT: { language: 'it-IT', currency: 'EUR', domain: 'www.ebay.it' },
  EBAY_FR: { language: 'fr-FR', currency: 'EUR', domain: 'www.ebay.fr' },
  EBAY_GB: { language: 'en-GB', currency: 'GBP', domain: 'www.ebay.co.uk' },
} as const;
type Market = keyof typeof PUBLISH_MARKETS;
const MARKETS = Object.keys(PUBLISH_MARKETS) as [Market, ...Market[]];

/** Our condition scale -> eBay condition ids in order of preference (the category decides which exist). */
const CONDITION_PREFERENCE: Record<string, readonly string[]> = {
  new: ['1000', '1500'],
  like_new: ['2750', '3000', '4000'],
  very_good: ['4000', '3000'],
  good: ['5000', '3000'],
  fair: ['6000', '5000', '3000'],
  poor: ['6000', '3000'],
  for_parts: ['7000'],
};
const CONDITION_ENUM: Record<string, string> = {
  '1000': 'NEW', '1500': 'NEW_OTHER', '1750': 'NEW_WITH_DEFECTS', '2000': 'CERTIFIED_REFURBISHED', '2010': 'EXCELLENT_REFURBISHED',
  '2020': 'VERY_GOOD_REFURBISHED', '2030': 'GOOD_REFURBISHED', '2500': 'SELLER_REFURBISHED', '2750': 'LIKE_NEW', '2990': 'PRE_OWNED_EXCELLENT',
  '3000': 'USED_EXCELLENT', '3010': 'PRE_OWNED_FAIR', '4000': 'USED_VERY_GOOD', '5000': 'USED_GOOD', '6000': 'USED_ACCEPTABLE', '7000': 'FOR_PARTS_OR_NOT_WORKING',
};

const IMAGE = z.string().regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/).max(5 * 1024 * 1024);

const PublishBody = z.object({
  marketplace: z.enum(MARKETS),
  title: z.string().trim().min(3).max(80),
  description: z.string().trim().min(1).max(8000),
  price: z.number().positive().max(100_000),
  condition: z.enum(['new', 'like_new', 'very_good', 'good', 'fair', 'poor', 'for_parts']),
  conditionNote: z.string().trim().max(1000).optional(),
  categoryId: z.string().regex(/^\d+$/),
  aspects: z.record(z.string().min(1).max(65), z.array(z.string().trim().min(1).max(65)).min(1).max(30)).default({}),
  images: z.array(IMAGE).min(1).max(12),
  fulfillmentPolicyId: z.string().min(1).max(40),
  postalCode: z.string().trim().min(3).max(12),
  country: z.string().regex(/^[A-Z]{2}$/),
  /** Private or business seller: decides the default return policy we create when the seller has none. */
  business: z.boolean().default(false),
});

class EbayError extends Error {
  constructor(message: string, readonly status: number, readonly ebay: { errorId?: number; message?: string; longMessage?: string; parameters?: { name?: string; value?: string }[] }[] = []) {
    super(message);
  }
}

/** Human-readable eBay errors (they come in the site language for the user token's marketplace, usually English). */
const ebayMessage = (e: EbayError): string => e.ebay.map((x) => x.longMessage || x.message).filter(Boolean).join(' ') || e.message;

export function registerEbayPublishRoutes(
  app: FastifyInstance,
  deps: { db: Db; cfg: EbaySellConfig; requireSignedIn: (req: FastifyRequest, reply: FastifyReply) => Promise<string | undefined> },
): void {
  const { db, cfg } = deps;
  const api = cfg.sandbox ? 'https://api.sandbox.ebay.com' : 'https://api.ebay.com';
  const auth = cfg.sandbox ? 'https://auth.sandbox.ebay.com' : 'https://auth.ebay.com';
  const apiz = cfg.sandbox ? 'https://apiz.sandbox.ebay.com' : 'https://apiz.ebay.com';
  const media = cfg.sandbox ? 'https://apim.sandbox.ebay.com' : 'https://apim.ebay.com';
  const key = Buffer.from(cfg.tokenKey, 'base64');
  if (key.length !== 32) throw new Error('EBAY_TOKEN_KEY must be 32 bytes, base64');
  const basic = Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString('base64');

  // ---------- crypto ----------
  const encrypt = (plain: string): string => {
    const iv = randomBytes(12);
    const c = createCipheriv('aes-256-gcm', key, iv);
    const data = Buffer.concat([c.update(plain, 'utf8'), c.final()]);
    return Buffer.concat([iv, c.getAuthTag(), data]).toString('base64');
  };
  const decrypt = (enc: string): string => {
    const raw = Buffer.from(enc, 'base64');
    const d = createDecipheriv('aes-256-gcm', key, raw.subarray(0, 12));
    d.setAuthTag(raw.subarray(12, 28));
    return Buffer.concat([d.update(raw.subarray(28)), d.final()]).toString('utf8');
  };
  const sign = (s: string): string => createHmac('sha256', key).update(s).digest('base64url');
  const makeState = (uid: string): string => {
    const body = `${uid}.${Date.now() + 15 * 60_000}`;
    return `${body}.${sign(body)}`;
  };
  const readState = (state: string): string | undefined => {
    const [uid, exp, sig] = state.split('.');
    if (!uid || !exp || !sig || Number(exp) < Date.now()) return undefined;
    const want = Buffer.from(sign(`${uid}.${exp}`));
    const got = Buffer.from(sig);
    return want.length === got.length && timingSafeEqual(want, got) ? uid : undefined;
  };

  // ---------- tokens ----------
  let appToken: { value: string; exp: number } | undefined;
  const userTokens = new Map<string, { value: string; exp: number }>();

  async function tokenRequest(body: string): Promise<{ access_token: string; expires_in: number; refresh_token?: string; refresh_token_expires_in?: number }> {
    const res = await fetch(`${api}/identity/v1/oauth2/token`, {
      method: 'POST',
      headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    const json = (await res.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; refresh_token?: string; refresh_token_expires_in?: number; error?: string; error_description?: string };
    if (!res.ok || !json.access_token) throw new EbayError(`eBay OAuth failed: ${json.error_description ?? json.error ?? res.status}`, res.status === 400 ? 401 : 502);
    return json as { access_token: string; expires_in: number; refresh_token?: string; refresh_token_expires_in?: number };
  }

  async function applicationToken(): Promise<string> {
    if (appToken && appToken.exp > Date.now()) return appToken.value;
    const t = await tokenRequest(`grant_type=client_credentials&scope=${encodeURIComponent('https://api.ebay.com/oauth/api_scope')}`);
    appToken = { value: t.access_token, exp: Date.now() + (t.expires_in - 60) * 1000 };
    return appToken.value;
  }

  /** The user's access token from their stored refresh token; undefined when not connected or the grant was revoked. */
  async function userToken(uid: string): Promise<string | undefined> {
    const cached = userTokens.get(uid);
    if (cached && cached.exp > Date.now()) return cached.value;
    const acc = await getEbayAccount(db, uid);
    if (!acc || acc.refreshExpiresAt.getTime() < Date.now()) return undefined;
    try {
      const t = await tokenRequest(`grant_type=refresh_token&refresh_token=${encodeURIComponent(decrypt(acc.refreshTokenEnc))}&scope=${encodeURIComponent(SCOPES.join(' '))}`);
      userTokens.set(uid, { value: t.access_token, exp: Date.now() + (t.expires_in - 60) * 1000 });
      return t.access_token;
    } catch (e) {
      // Revoked on eBay's side (or scopes changed): forget the connection so the user can reconnect.
      if (e instanceof EbayError && e.status === 401) await deleteEbayAccount(db, uid);
      throw e;
    }
  }

  async function call<T>(token: string, method: string, url: string, body?: unknown, headers: Record<string, string> = {}): Promise<{ status: number; json: T; headers: Headers }> {
    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
        ...headers,
      },
      ...(body !== undefined && { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(30_000),
    });
    const text = await res.text();
    const json = (text ? JSON.parse(text) : {}) as T & { errors?: EbayError['ebay'] };
    if (!res.ok) throw new EbayError(`eBay HTTP ${res.status} on ${method} ${url.replace(/\?.*/, '')}`, res.status, json.errors ?? []);
    return { status: res.status, json, headers: res.headers };
  }

  // ---------- connect ----------
  app.get('/api/ebay/status', async (req, reply) => {
    const uid = await deps.requireSignedIn(req, reply);
    if (!uid) return reply;
    const acc = await getEbayAccount(db, uid);
    return { connected: Boolean(acc && acc.refreshExpiresAt.getTime() > Date.now()), username: acc?.username ?? null, postalCode: acc?.postalCode ?? null };
  });

  app.get('/api/ebay/connect', async (req, reply) => {
    const uid = await deps.requireSignedIn(req, reply);
    if (!uid) return reply;
    const lang = String((req.query as { lang?: string }).lang ?? 'en');
    const locale = { de: 'de-DE', it: 'it-IT', fr: 'fr-FR' }[lang] ?? 'en-GB';
    const params = new URLSearchParams({ client_id: cfg.clientId, redirect_uri: cfg.ruName, response_type: 'code', scope: SCOPES.join(' '), state: makeState(uid), locale, prompt: 'login' });
    return { url: `${auth}/oauth2/authorize?${params}` };
  });

  // eBay sends the browser back here (no device header): the signed state says who connected.
  app.get('/api/ebay/callback', async (req, reply) => {
    const q = req.query as { code?: string; state?: string; error?: string };
    const uid = q.state ? readState(q.state) : undefined;
    if (!uid || !q.code) {
      req.log.warn({ event: 'ebay_connect_failed', reason: q.error ?? (uid ? 'no_code' : 'bad_state') }, 'eBay connect failed');
      return reply.redirect(`/?ebay=${q.error === 'access_denied' ? 'declined' : 'error'}`, 302);
    }
    try {
      const t = await tokenRequest(`grant_type=authorization_code&code=${encodeURIComponent(q.code)}&redirect_uri=${encodeURIComponent(cfg.ruName)}`);
      if (!t.refresh_token) throw new Error('no refresh token');
      const me = await call<{ userId?: string; username?: string }>(t.access_token, 'GET', `${apiz}/commerce/identity/v1/user/`);
      if (!me.json.userId) throw new Error('no eBay user id');
      await saveEbayAccount(db, {
        userId: uid,
        ebayUserId: me.json.userId,
        username: me.json.username ?? null,
        refreshTokenEnc: encrypt(t.refresh_token),
        refreshExpiresAt: new Date(Date.now() + (t.refresh_token_expires_in ?? 47_304_000) * 1000),
      });
      userTokens.set(uid, { value: t.access_token, exp: Date.now() + (t.expires_in - 60) * 1000 });
      req.log.info({ event: 'ebay_connected' }, 'eBay account connected');
      return reply.redirect('/?ebay=connected', 302);
    } catch (e) {
      req.log.error({ event: 'ebay_connect_failed', err: e instanceof Error ? e.message : String(e) }, 'eBay connect failed');
      return reply.redirect('/?ebay=error', 302);
    }
  });

  app.post('/api/ebay/disconnect', async (req, reply) => {
    const uid = await deps.requireSignedIn(req, reply);
    if (!uid) return reply;
    await deleteEbayAccount(db, uid);
    userTokens.delete(uid);
    return { connected: false };
  });

  /** Everything the publish sheet needs: suggested categories for the title and the seller's shipping policies. */
  app.post('/api/ebay/prepare', async (req, reply) => {
    const uid = await deps.requireSignedIn(req, reply);
    if (!uid) return reply;
    const b = z.object({ marketplace: z.enum(MARKETS), title: z.string().trim().min(2).max(200) }).safeParse(req.body);
    if (!b.success) return reply.code(400).send({ error: 'invalid_request' });
    const token = await userToken(uid).catch(() => undefined);
    if (!token) return reply.code(409).send({ error: 'ebay_not_connected' });
    try {
      const [categories, shipping] = await Promise.all([suggestCategories(b.data.marketplace, b.data.title), shippingPolicies(token, b.data.marketplace)]);
      const acc = await getEbayAccount(db, uid);
      return { categories, shipping, postalCode: acc?.postalCode ?? null, username: acc?.username ?? null };
    } catch (e) {
      if (e instanceof EbayError) return reply.code(502).send({ error: 'ebay_error', message: ebayMessage(e) });
      throw e;
    }
  });

  app.post('/api/ebay/aspects', async (req, reply) => {
    const uid = await deps.requireSignedIn(req, reply);
    if (!uid) return reply;
    const q = z
      .object({ marketplace: z.enum(MARKETS), categoryId: z.string().regex(/^\d+$/), title: z.string().max(200).default(''), description: z.string().max(8000).default('') })
      .safeParse(req.body);
    if (!q.success) return reply.code(400).send({ error: 'invalid_request' });
    try {
      const aspects = await requiredAspects(q.data.marketplace, q.data.categoryId);
      const suggested = q.data.title ? await fillAspects(aspects, q.data.title, q.data.description, PUBLISH_MARKETS[q.data.marketplace].language).catch(() => ({})) : {};
      return { aspects: aspects.map((a) => ({ ...a, values: a.selectionOnly ? a.values : a.values.slice(0, 100) })), suggested };
    } catch (e) {
      if (e instanceof EbayError) return reply.code(502).send({ error: 'ebay_error', message: ebayMessage(e) });
      throw e;
    }
  });

  app.post('/api/ebay/publish', async (req, reply) => {
    const uid = await deps.requireSignedIn(req, reply);
    if (!uid) return reply;
    const parsed = PublishBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_request', issues: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`) });
    const b = parsed.data;
    const token = await userToken(uid).catch(() => undefined);
    if (!token) return reply.code(409).send({ error: 'ebay_not_connected' });
    const market = PUBLISH_MARKETS[b.marketplace];
    const step = { name: 'start' };
    try {
      step.name = 'policies';
      const [paymentPolicyId, returnPolicyId] = await Promise.all([paymentPolicy(token, b.marketplace), returnPolicy(token, b.marketplace, b.business)]);
      step.name = 'location';
      await setEbayPostalCode(db, uid, b.postalCode);
      const merchantLocationKey = await location(token, b.country, b.postalCode);
      step.name = 'photos';
      const imageUrls: string[] = [];
      for (const img of b.images) imageUrls.push(await uploadImage(token, img));
      step.name = 'condition';
      const condition = await conditionFor(b.marketplace, b.categoryId, b.condition);
      step.name = 'item';
      const sku = `fl-${randomUUID()}`;
      await call(token, 'PUT', `${api}/sell/inventory/v1/inventory_item/${sku}`, {
        availability: { shipToLocationAvailability: { quantity: 1 } },
        condition,
        ...(b.conditionNote && condition !== 'NEW' && { conditionDescription: b.conditionNote }),
        product: { title: b.title, description: b.description, aspects: b.aspects, imageUrls },
      }, { 'Content-Language': market.language });
      step.name = 'offer';
      const offer = await call<{ offerId: string }>(token, 'POST', `${api}/sell/inventory/v1/offer`, {
        sku,
        marketplaceId: b.marketplace,
        format: 'FIXED_PRICE',
        availableQuantity: 1,
        categoryId: b.categoryId,
        listingDescription: toHtml(b.description),
        listingPolicies: { fulfillmentPolicyId: b.fulfillmentPolicyId, paymentPolicyId, returnPolicyId },
        pricingSummary: { price: { value: b.price.toFixed(2), currency: market.currency } },
        merchantLocationKey,
      }, { 'Content-Language': market.language });
      step.name = 'publish';
      const pub = await call<{ listingId: string }>(token, 'POST', `${api}/sell/inventory/v1/offer/${offer.json.offerId}/publish`, {});
      req.log.info({ event: 'ebay_published', marketplace: b.marketplace, photos: imageUrls.length }, 'listing published on eBay');
      return { listingId: pub.json.listingId, url: `https://${market.domain}/itm/${pub.json.listingId}` };
    } catch (e) {
      if (e instanceof EbayError) {
        req.log.warn({ event: 'ebay_publish_failed', step: step.name, status: e.status, errors: e.ebay.map((x) => x.errorId) }, 'eBay publish failed');
        return reply.code(502).send({ error: 'ebay_error', step: step.name, message: ebayMessage(e) });
      }
      throw e;
    }
  });

  // ---------- Marketplace Account Deletion (required by eBay for apps that store eBay user data) ----------
  app.get('/api/ebay/account-deletion', async (req, reply) => {
    const code = (req.query as { challenge_code?: string }).challenge_code;
    if (!code || !cfg.verificationToken || !cfg.deletionEndpoint) return reply.code(400).send({ error: 'not_configured' });
    const challengeResponse = createHash('sha256').update(code).update(cfg.verificationToken).update(cfg.deletionEndpoint).digest('hex');
    return reply.type('application/json').send({ challengeResponse });
  });

  app.post('/api/ebay/account-deletion', async (req, reply) => {
    const n = req.body as { metadata?: { topic?: string }; notification?: { data?: { userId?: string } } } | undefined;
    const ebayUserId = n?.notification?.data?.userId;
    if (n?.metadata?.topic === 'MARKETPLACE_ACCOUNT_DELETION' && ebayUserId) {
      const removed = await deleteEbayAccountsByEbayUser(db, ebayUserId);
      req.log.info({ event: 'ebay_account_deletion', removed }, 'eBay account deletion notification');
    }
    return reply.code(204).send();
  });

  // ---------- helpers ----------
  const treeIds = new Map<string, string>();
  async function treeId(m: Market): Promise<string> {
    const hit = treeIds.get(m);
    if (hit) return hit;
    const r = await call<{ categoryTreeId: string }>(await applicationToken(), 'GET', `${api}/commerce/taxonomy/v1/get_default_category_tree_id?marketplace_id=${m}`);
    treeIds.set(m, r.json.categoryTreeId);
    return r.json.categoryTreeId;
  }

  async function suggestCategories(m: Market, title: string): Promise<{ id: string; name: string; path: string }[]> {
    const id = await treeId(m);
    const r = await call<{ categorySuggestions?: { category: { categoryId: string; categoryName: string }; categoryTreeNodeAncestors?: { categoryName: string }[] }[] }>(
      await applicationToken(),
      'GET',
      `${api}/commerce/taxonomy/v1/category_tree/${id}/get_category_suggestions?q=${encodeURIComponent(title.slice(0, 100))}`,
      undefined,
      { 'Accept-Language': PUBLISH_MARKETS[m].language },
    );
    return (r.json.categorySuggestions ?? []).slice(0, 6).map((s) => ({
      id: s.category.categoryId,
      name: s.category.categoryName,
      path: [...(s.categoryTreeNodeAncestors ?? [])].reverse().map((a) => a.categoryName).concat(s.category.categoryName).join(' > '),
    }));
  }

  async function requiredAspects(m: Market, categoryId: string): Promise<{ name: string; values: string[]; selectionOnly: boolean; multiple: boolean }[]> {
    const id = await treeId(m);
    const r = await call<{ aspects?: { localizedAspectName: string; aspectConstraint: { aspectRequired?: boolean; aspectMode?: string; itemToAspectCardinality?: string }; aspectValues?: { localizedValue: string }[] }[] }>(
      await applicationToken(),
      'GET',
      `${api}/commerce/taxonomy/v1/category_tree/${id}/get_item_aspects_for_category?category_id=${categoryId}`,
      undefined,
      { 'Accept-Language': PUBLISH_MARKETS[m].language },
    );
    return (r.json.aspects ?? [])
      .filter((a) => a.aspectConstraint.aspectRequired)
      .map((a) => ({
        name: a.localizedAspectName,
        values: (a.aspectValues ?? []).slice(0, 3000).map((v) => v.localizedValue),
        selectionOnly: a.aspectConstraint.aspectMode === 'SELECTION_ONLY',
        multiple: a.aspectConstraint.itemToAspectCardinality === 'MULTI',
      }));
  }

  /** Required item specifics from the listing text: only what the text states or the model name makes certain. */
  async function fillAspects(aspects: { name: string; values: string[]; selectionOnly: boolean }[], title: string, description: string, language: string): Promise<Record<string, string>> {
    if (!cfg.openaiKey || aspects.length === 0) return {};
    const spec = aspects.map((a) => `- ${a.name}${a.selectionOnly ? ` (one of: ${a.values.slice(0, 60).join(', ')})` : a.values.length ? ` (e.g. ${a.values.slice(0, 15).join(', ')})` : ''}`).join('\n');
    const res = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${cfg.openaiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: cfg.textModel,
        store: false,
        reasoning: { effort: 'none' },
        input: [
          {
            role: 'system',
            content: `You fill eBay item specifics for a second-hand listing, in the marketplace language (${language}). Use only facts stated in the title or description, or certain from the exact model (e.g. a Sony WH-1000XM4 is Bluetooth over-ear headphones). Otherwise leave the value empty. Keep values short, as eBay lists them.`,
          },
          { role: 'user', content: `Title: ${title}\n\nDescription:\n${description.slice(0, 3000)}\n\nItem specifics to fill:\n${spec}` },
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'aspects',
            strict: true,
            schema: {
              type: 'object',
              additionalProperties: false,
              required: ['values'],
              properties: { values: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['name', 'value'], properties: { name: { type: 'string' }, value: { type: 'string' } } } } },
            },
          },
        },
      }),
      signal: AbortSignal.timeout(20_000),
    });
    const json = (await res.json()) as { output?: { type: string; content?: { type: string; text?: string }[] }[] };
    const text = json.output?.find((o) => o.type === 'message')?.content?.find((c) => c.type === 'output_text')?.text;
    if (!res.ok || !text) return {};
    const out: Record<string, string> = {};
    for (const { name, value } of (JSON.parse(text) as { values: { name: string; value: string }[] }).values) {
      const a = aspects.find((x) => x.name === name);
      const v = value.trim().slice(0, 65);
      if (!a || !v) continue;
      if (a.selectionOnly && !a.values.includes(v)) continue;
      out[name] = v;
    }
    return out;
  }

  async function conditionFor(m: Market, categoryId: string, ours: string): Promise<string> {
    const r = await call<{ itemConditionPolicies?: { itemConditions?: { conditionId: string }[] }[] }>(
      await applicationToken(),
      'GET',
      `${api}/sell/metadata/v1/marketplace/${m}/get_item_condition_policies?filter=${encodeURIComponent(`categoryIds:{${categoryId}}`)}`,
    ).catch(() => undefined);
    const allowed = new Set((r?.json.itemConditionPolicies?.[0]?.itemConditions ?? []).map((c) => c.conditionId));
    const pick = (CONDITION_PREFERENCE[ours] ?? ['3000']).find((id) => allowed.size === 0 || allowed.has(id)) ?? [...allowed].find((id) => id !== '1000' && id !== '1500') ?? '3000';
    return CONDITION_ENUM[pick] ?? 'USED_EXCELLENT';
  }

  /** Business policies need the seller opted in; eBay migrated most sellers already, else we opt them in. */
  async function ensureOptedIn(token: string): Promise<void> {
    const r = await call<{ programs?: { programType: string }[] }>(token, 'GET', `${api}/sell/account/v1/program/get_opted_in_programs`);
    if (!(r.json.programs ?? []).some((p) => p.programType === 'SELLING_POLICY_MANAGEMENT')) {
      await call(token, 'POST', `${api}/sell/account/v1/program/opt_in`, { programType: 'SELLING_POLICY_MANAGEMENT' });
    }
  }

  async function shippingPolicies(token: string, m: Market): Promise<{ id: string; name: string; description: string }[]> {
    await ensureOptedIn(token);
    const r = await call<{ fulfillmentPolicies?: { fulfillmentPolicyId: string; name: string; description?: string; shippingOptions?: { shippingServices?: { shippingCost?: { value: string; currency: string } }[] }[] }[] }>(
      token,
      'GET',
      `${api}/sell/account/v1/fulfillment_policy?marketplace_id=${m}`,
    );
    return (r.json.fulfillmentPolicies ?? []).map((p) => {
      const cost = p.shippingOptions?.[0]?.shippingServices?.[0]?.shippingCost;
      return { id: p.fulfillmentPolicyId, name: p.name, description: p.description ?? (cost ? `${cost.value} ${cost.currency}` : '') };
    });
  }

  async function paymentPolicy(token: string, m: Market): Promise<string> {
    const r = await call<{ paymentPolicies?: { paymentPolicyId: string }[] }>(token, 'GET', `${api}/sell/account/v1/payment_policy?marketplace_id=${m}`);
    const existing = r.json.paymentPolicies?.[0]?.paymentPolicyId;
    if (existing) return existing;
    const c = await call<{ paymentPolicyId: string }>(token, 'POST', `${api}/sell/account/v1/payment_policy`, {
      name: 'FlipLens payment',
      marketplaceId: m,
      categoryTypes: [{ name: 'ALL_EXCLUDING_MOTORS_VEHICLES' }],
      immediatePay: true,
    });
    return c.json.paymentPolicyId;
  }

  /** Private sellers: no returns (allowed for private sales in the EU and UK). Business sellers: 30 days, buyer pays return shipping. */
  async function returnPolicy(token: string, m: Market, business: boolean): Promise<string> {
    const r = await call<{ returnPolicies?: { returnPolicyId: string }[] }>(token, 'GET', `${api}/sell/account/v1/return_policy?marketplace_id=${m}`);
    const existing = r.json.returnPolicies?.[0]?.returnPolicyId;
    if (existing) return existing;
    const c = await call<{ returnPolicyId: string }>(token, 'POST', `${api}/sell/account/v1/return_policy`, {
      name: business ? 'FlipLens returns 30 days' : 'FlipLens no returns',
      marketplaceId: m,
      categoryTypes: [{ name: 'ALL_EXCLUDING_MOTORS_VEHICLES' }],
      ...(business
        ? { returnsAccepted: true, returnPeriod: { value: 30, unit: 'DAY' }, returnShippingCostPayer: 'BUYER', refundMethod: 'MONEY_BACK' }
        : { returnsAccepted: false }),
    });
    return c.json.returnPolicyId;
  }

  async function location(token: string, country: string, postalCode: string): Promise<string> {
    const keyName = `fliplens-${country}-${postalCode}`.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 36);
    try {
      await call(token, 'POST', `${api}/sell/inventory/v1/location/${keyName}`, {
        location: { address: { postalCode, country } },
        locationTypes: ['WAREHOUSE'],
        name: `FlipLens ${postalCode}`,
        merchantLocationStatus: 'ENABLED',
      });
    } catch (e) {
      if (!(e instanceof EbayError && e.status === 409)) throw e;
    }
    return keyName;
  }

  async function uploadImage(token: string, dataUrl: string): Promise<string> {
    const [head, b64] = dataUrl.split(',');
    const type = /data:(image\/[a-z]+)/.exec(head ?? '')?.[1] ?? 'image/jpeg';
    const form = new FormData();
    form.append('image', new Blob([Buffer.from(b64 ?? '', 'base64')], { type }), `photo.${type.split('/')[1]}`);
    const res = await fetch(`${media}/commerce/media/v1_beta/image/create_image_from_file`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      body: form,
      signal: AbortSignal.timeout(60_000),
    });
    const json = (await res.json().catch(() => ({}))) as { imageUrl?: string; errors?: EbayError['ebay'] };
    if (!res.ok) throw new EbayError(`eBay image upload HTTP ${res.status}`, res.status, json.errors ?? []);
    if (json.imageUrl) return json.imageUrl;
    const loc = res.headers.get('location');
    if (!loc) throw new EbayError('eBay image upload returned no image', 502);
    const img = await call<{ imageUrl: string }>(token, 'GET', loc);
    return img.json.imageUrl;
  }
}

/** Plain text from the listing writer -> simple HTML for the eBay description. */
function toHtml(text: string): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return text
    .split(/\n{2,}/)
    .map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`)
    .join('');
}
