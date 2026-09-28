import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { CATEGORIES, CONDITIONS } from '@fliplens/core';
import { addItem, loadItems } from '@fliplens/eval';

/** Local-only endpoints that grow the benchmark dataset from the test app. */

const JPEG_DATA_URL = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/;
const optionalText = z.string().trim().max(200).optional();

const AddItemBody = z.object({
  images: z.array(z.string().regex(JPEG_DATA_URL, 'must be a base64 JPEG data URL').max(5 * 1024 * 1024)).min(1).max(3),
  category: z.enum(CATEGORIES),
  truth: z.object({
    brand: z.string().trim().min(1).max(100),
    model: z.string().trim().min(1).max(200),
    variant: optionalText,
    capacity: optionalText,
    mount: optionalText,
    colour: optionalText,
    gtin: z.string().regex(/^\d{8,14}$/).optional(),
  }),
  condition: z.enum(CONDITIONS),
  purchasePriceEur: z.number().min(0).max(100_000),
  marketRange: z
    .object({
      low: z.number().positive().max(100_000),
      high: z.number().positive().max(100_000),
      kind: z.enum(['sold', 'asking', 'mixed']),
    })
    .refine((r) => r.low <= r.high, 'low must be <= high'),
  photoContext: z.enum(['in_hand_shop_light', 'on_table', 'boxed', 'label_visible', 'poor_light']).optional(),
  referenceUrls: z.array(z.string().url().max(2000)).max(10).optional(),
  notes: z.string().max(2000).optional(),
});

export function registerBenchmarkRoutes(app: FastifyInstance): void {
  app.get('/api/benchmark/items', async () => {
    const items = await loadItems();
    const byPrefix: Record<string, number> = {};
    for (const i of items) {
      const p = i.id.slice(0, 2);
      byPrefix[p] = (byPrefix[p] ?? 0) + 1;
    }
    return { count: items.length, byPrefix, latest: items.slice(-5).map((i) => ({ id: i.id, name: `${i.truth.brand} ${i.truth.model}` })) };
  });

  app.post('/api/benchmark/items', async (req, reply) => {
    const parsed = AddItemBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_request', issues: parsed.error.issues.map((i) => i.message) });
    const b = parsed.data;
    const t = b.truth;
    const item = await addItem(
      {
        category: b.category,
        truth: {
          brand: t.brand,
          model: t.model,
          variant: t.variant ?? null,
          capacity: t.capacity ?? null,
          mount: t.mount ?? null,
          colour: t.colour ?? null,
          gtin: t.gtin ?? null,
        },
        condition: b.condition,
        hypothetical_purchase_price_eur: b.purchasePriceEur,
        market_range_eur: { ...b.marketRange, captured_at: new Date().toISOString().slice(0, 10) },
        ...(b.photoContext && { photo_context: b.photoContext }),
        ...(b.referenceUrls && { reference_urls: b.referenceUrls }),
        ...(b.notes && { notes: b.notes }),
      },
      b.images.map((d) => Buffer.from(d.match(JPEG_DATA_URL)![1]!, 'base64')),
    );
    req.log.info({ event: 'benchmark_item_added', id: item.id }, 'benchmark item added');
    return { id: item.id, count: (await loadItems()).length };
  });
}
