import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { RecognitionError, type OpenAIShelfScanner } from '@fliplens/recognition';
import type { Persistence } from './persistence.js';

/**
 * Live radar: the phone sends a small camera frame every few seconds while it moves; we answer with the products in
 * it and where they are. Names and boxes only: prices come from a normal check when the user taps an item, so the
 * radar never shows a guessed price. Always the cheap vision model; frames are capped per day (RADAR_FRAMES_PER_DAY).
 */
const MIN_CONFIDENCE = 0.35;
/** Server-side floor between frames of one device, whatever the client does. */
const MIN_INTERVAL_MS = 1200;

const Body = z.object({
  image: z.string().regex(/^data:image\/(jpeg|webp);base64,[A-Za-z0-9+/=]+$/).max(1_500_000),
});

export function registerRadarRoute(app: FastifyInstance, deps: { store: Persistence; scanner: OpenAIShelfScanner; model: string }): void {
  const last = new Map<string, number>();

  app.post('/api/radar/frame', async (req, reply) => {
    const parsed = Body.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_request' });
    if (!(await deps.store.requireRadar(req, reply))) return reply;
    if (!deps.scanner.isConfigured()) return reply.code(409).send({ error: 'vision_not_configured' });

    const device = String(req.headers['x-device-id'] ?? '');
    const now = Date.now();
    if (now - (last.get(device) ?? 0) < MIN_INTERVAL_MS) return reply.code(429).send({ error: 'too_fast' });
    last.set(device, now);
    if (last.size > 5000) last.clear();

    try {
      const scan = await deps.scanner.scan(parsed.data.image, { model: deps.model, tag: 'radar-v1', fast: true });
      await deps.store.recordRadarFrame(req, { model: scan.modelVersion, inputTokens: scan.usage.inputTokens, outputTokens: scan.usage.outputTokens, costUsd: scan.costUsd });
      req.log.info({ event: 'radar_frame', items: scan.items.length, latencyMs: scan.latencyMs, costUsd: scan.costUsd ?? null }, 'radar frame');
      return {
        items: scan.items
          .filter((i) => i.confidence >= MIN_CONFIDENCE)
          .map((i) => ({ label: i.label, brand: i.brand, model: i.model, category: i.category, capacity: i.capacity, box: i.box, confidence: i.confidence })),
        latencyMs: scan.latencyMs,
      };
    } catch (e) {
      if (e instanceof RecognitionError) return reply.code(502).send({ error: 'recognition_failed', kind: e.kind, message: e.message });
      throw e;
    }
  });
}
