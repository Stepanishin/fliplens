import { CATEGORIES, type CategorySlug } from '@fliplens/core';
import { RecognitionError } from './types.js';

/**
 * "Scan the table": one photo of a flea market stall, box or shelf -> every product a reseller could look up, with
 * where it is in the photo. Prices come later from real listings, never from the model.
 */

export interface ShelfItem {
  label: string;
  category: CategorySlug;
  brand: string;
  model: string;
  capacity: string | null;
  /** Normalised to the photo: 0..1 from the top-left corner. */
  box: { x: number; y: number; w: number; h: number };
  confidence: number;
}

export interface ShelfScan {
  items: ShelfItem[];
  usage: { inputTokens: number; outputTokens: number };
  costUsd?: number;
  latencyMs: number;
  modelVersion: string;
}

const PRICING: Record<string, readonly [number, number]> = {
  'gpt-6-astra': [10, 50],
  'gpt-6-sol': [2, 10],
  'gpt-6-luna': [0.1, 0.5],
};

const PROMPT = `You look at one photo of a flea market stall, a table, a box or a shelf of second-hand goods, for a European reseller.
List every distinct product that a reseller could look up by brand and model: consumer electronics, phones, tablets, laptops, headphones, speakers, smartwatches, consoles, handhelds, controllers, video games, cameras, lenses, power tools, and other branded goods with a readable or recognisable model.
Rules:
- Skip clutter and generic items without a recognisable brand or model (cables, plain mugs, unbranded clothes, decoration).
- One entry per physical item. Do not merge different items; do not list the same item twice.
- brand and model as written in marketplace titles (e.g. "Sony" + "WH-1000XM4", "Nintendo" + "Switch OLED"). Video games: brand = platform maker or publisher, model = the game title and platform (e.g. "Nintendo" + "Mario Kart 8 Deluxe Switch").
- capacity only if printed or visible, else null. Never guess it.
- label: a short display name, e.g. "Sony WH-1000XM4".
- box: the item's bounding box as fractions of the image width and height, x and y of the top-left corner, all values between 0 and 1. Be as accurate as you can.
- confidence: your probability (0 to 1) that brand and model are exactly right.
- category: the closest from the list; "other" if none fits.
- At most 12 items, most valuable-looking first. Empty list if nothing qualifies.`;

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['items'],
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['label', 'category', 'brand', 'model', 'capacity', 'box', 'confidence'],
        properties: {
          label: { type: 'string' },
          category: { type: 'string', enum: [...CATEGORIES] },
          brand: { type: 'string' },
          model: { type: 'string' },
          capacity: { type: ['string', 'null'] },
          box: {
            type: 'object',
            additionalProperties: false,
            required: ['x', 'y', 'w', 'h'],
            properties: { x: { type: 'number' }, y: { type: 'number' }, w: { type: 'number' }, h: { type: 'number' } },
          },
          confidence: { type: 'number' },
        },
      },
    },
  },
} as const;

const clamp01 = (n: number): number => Math.min(1, Math.max(0, Number.isFinite(n) ? n : 0));

export class OpenAIShelfScanner {
  readonly id: string;
  constructor(
    private readonly apiKey: string,
    private readonly model = 'gpt-6-sol',
    private readonly fetchImpl: typeof fetch = fetch,
  ) {
    this.id = `openai:${model}`;
  }

  isConfigured(): boolean {
    return this.apiKey.length > 0;
  }

  /** `model` overrides the default (e.g. the cheap model once the user's AI budget is spent). */
  async scan(imageDataUrl: string, opts: { model?: string } = {}): Promise<ShelfScan> {
    if (!this.isConfigured()) throw new RecognitionError('OPENAI_API_KEY is not set', 'not_configured');
    const model = opts.model ?? this.model;
    const started = Date.now();
    let res: Response;
    try {
      res = await this.fetchImpl('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          store: false,
          input: [
            { role: 'system', content: PROMPT },
            { role: 'user', content: [{ type: 'input_text', text: 'List the products in this photo.' }, { type: 'input_image', image_url: imageDataUrl, detail: 'high' }] },
          ],
          text: { format: { type: 'json_schema', name: 'shelf_scan', schema: SCHEMA, strict: true } },
        }),
        signal: AbortSignal.timeout(60_000),
      });
    } catch (e) {
      throw new RecognitionError(`OpenAI request failed: ${e instanceof Error ? e.message : String(e)}`, 'provider_error');
    }
    const json = (await res.json().catch(() => ({}))) as {
      output?: { type: string; content?: { type: string; text?: string; refusal?: string }[] }[];
      usage?: { input_tokens?: number; output_tokens?: number };
      error?: { message?: string };
    };
    if (!res.ok) throw new RecognitionError(`OpenAI HTTP ${res.status}: ${json.error?.message ?? res.statusText}`, 'provider_error');
    const content = json.output?.find((o) => o.type === 'message')?.content ?? [];
    const refusal = content.find((c) => c.type === 'refusal')?.refusal;
    if (refusal) throw new RecognitionError(`Model refused: ${refusal}`, 'refusal');
    const text = content.find((c) => c.type === 'output_text')?.text;
    if (!text) throw new RecognitionError('OpenAI returned no output text', 'bad_output');
    const raw = JSON.parse(text) as { items: ShelfItem[] };
    const inputTokens = json.usage?.input_tokens ?? 0;
    const outputTokens = json.usage?.output_tokens ?? 0;
    const price = PRICING[model];
    const items = raw.items
      .filter((i) => i.brand.trim() && i.model.trim())
      .slice(0, 12)
      .map((i) => {
        const x = clamp01(i.box.x);
        const y = clamp01(i.box.y);
        return {
          ...i,
          label: i.label.trim() || `${i.brand} ${i.model}`,
          brand: i.brand.trim(),
          model: i.model.trim(),
          capacity: i.capacity?.trim() || null,
          confidence: clamp01(i.confidence),
          box: { x, y, w: Math.min(clamp01(i.box.w), 1 - x), h: Math.min(clamp01(i.box.h), 1 - y) },
        };
      });
    return {
      items,
      usage: { inputTokens, outputTokens },
      ...(price && { costUsd: (inputTokens * price[0] + outputTokens * price[1]) / 1_000_000 }),
      latencyMs: Date.now() - started,
      modelVersion: `${this.id}@shelf-v1`,
    };
  }
}
