import { RecognitionError } from './types.js';

/**
 * Listing text generator (spec Phase 9): title, description, condition text and keywords in the style of the target
 * marketplace. Copy/paste only; we never post on the user's behalf (spec section 53).
 */

export type ListingMarketplace = 'ebay' | 'vinted' | 'kleinanzeigen';

export interface ListingInput {
  marketplace: ListingMarketplace;
  /** ISO 639-1, e.g. "de", "en", "sl". */
  language: string;
  brand: string;
  model: string;
  capacity?: string | null;
  category: string;
  condition: string;
  /** Seller notes: what is included, defects, colour ... */
  notes?: string;
  priceEur?: number;
  sellerType: 'private' | 'business';
}

/** A listing straight from photos: any item (clothes, shoes, home, toys, electronics), no prior identification. */
export interface PhotoListingInput {
  marketplace: ListingMarketplace;
  language: string;
  /** data: URLs (JPEG/PNG/WEBP), 1 to 3. */
  images: readonly string[];
  /** Condition as the user chose it, e.g. "Very good". */
  condition?: string;
  /** Size, brand, flaws, what is included ... Facts the photos cannot show. */
  notes?: string;
  sellerType: 'private' | 'business';
}

export interface PhotoListingText extends ListingText {
  item: { brand: string | null; type: string; colour: string | null };
  /** What a buyer will ask that the photos and notes do not answer (e.g. "size", "measurements"). */
  missing: string[];
}

export interface ListingText {
  title: string;
  description: string;
  conditionText: string;
  keywords: string[];
  usage: { inputTokens: number; outputTokens: number };
  costUsd?: number;
  modelVersion: string;
}

const PRICING: Record<string, readonly [number, number]> = {
  'gpt-6-astra': [10, 50],
  'gpt-6-sol': [2, 10],
  'gpt-6-luna': [0.1, 0.5],
};

const STYLE: Record<ListingMarketplace, string> = {
  ebay: `eBay: title max 80 characters, keyword-first (brand, model, variant, storage, colour, key feature, condition word), no emojis, no ALL CAPS words except model codes.
Description: short intro line, then a bullet list of key specs, a "Condition" paragraph, a "What's included" list, and a line about shipping from the seller's country. Factual, no hype.`,
  vinted: `Vinted: title max 60 characters, natural and friendly (brand + model + one key detail).
Description: 3-6 short sentences, casual and warm, mention condition honestly and what is included, then 5-8 relevant hashtags on the last line. At most two emojis.`,
  kleinanzeigen: `Kleinanzeigen: title max 65 characters, clear (brand, model, storage, condition).
Description: direct and practical, short paragraphs: what it is, condition, what is included, pickup or shipping possible.
For a private seller end with the usual private-sale note in the listing language (e.g. German: "Privatverkauf, daher keine Garantie oder Rücknahme.").`,
};

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'description', 'condition_text', 'keywords'],
  properties: {
    title: { type: 'string' },
    description: { type: 'string' },
    condition_text: { type: 'string' },
    keywords: { type: 'array', items: { type: 'string' } },
  },
} as const;

const PHOTO_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'description', 'condition_text', 'keywords', 'item', 'missing'],
  properties: {
    ...SCHEMA.properties,
    item: {
      type: 'object',
      additionalProperties: false,
      required: ['brand', 'type', 'colour'],
      properties: { brand: { type: ['string', 'null'] }, type: { type: 'string' }, colour: { type: ['string', 'null'] } },
    },
    missing: { type: 'array', items: { type: 'string' } },
  },
} as const;

export class OpenAIListingWriter {
  readonly id: string;
  constructor(
    private readonly apiKey: string,
    private readonly model = 'gpt-6-luna',
    private readonly fetchImpl: typeof fetch = fetch,
  ) {
    this.id = `openai:${model}`;
  }

  isConfigured(): boolean {
    return this.apiKey.length > 0;
  }

  async writeFromPhotos(input: PhotoListingInput): Promise<PhotoListingText> {
    if (!this.isConfigured()) throw new RecognitionError('OPENAI_API_KEY is not set', 'not_configured');
    const system = `You write second-hand marketplace listings for European sellers from photos of the item. Write the listing in the language with ISO code "${input.language}".
${STYLE[input.marketplace]}
Rules:
- Describe only what you can see in the photos or what the seller notes say. Brand only from a visible logo or label, or the notes. Never invent size, material, measurements, model, age or defects.
- If the item is not clearly visible or the photos show no sellable item, still return the fields but put the problem in "missing".
- condition_text: one honest sentence; use the seller's condition if given, otherwise describe visible wear.
- keywords: 5-10 search terms buyers would type (brand, item type, colour, style).
- item: brand (null if not visible), a short item type in English (e.g. "denim jacket", "running shoes", "table lamp"), colour (null if unclear).
- missing: up to 4 short English phrases for facts buyers usually ask about that are not visible or given (e.g. "size", "measurements", "material", "flaws"). Empty when nothing important is missing.
- Do not mention the price.`;
    const facts = [
      `Seller: ${input.sellerType}`,
      input.condition ? `Condition: ${input.condition}` : 'Condition: not given',
      input.notes ? `Seller notes: ${input.notes}` : 'Seller notes: none',
    ].join('\n');

    let res: Response;
    try {
      res = await this.fetchImpl('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          store: false,
          input: [
            { role: 'system', content: system },
            {
              role: 'user',
              content: [
                { type: 'input_text', text: `Write the listing for the item in ${input.images.length === 1 ? 'this photo' : `these ${input.images.length} photos (same item)`}.\n${facts}` },
                ...input.images.map((url) => ({ type: 'input_image', image_url: url, detail: 'high' })),
              ],
            },
          ],
          text: { format: { type: 'json_schema', name: 'photo_listing', schema: PHOTO_SCHEMA, strict: true } },
        }),
        signal: AbortSignal.timeout(60_000),
      });
    } catch (e) {
      throw new RecognitionError(`OpenAI request failed: ${e instanceof Error ? e.message : String(e)}`, 'provider_error');
    }
    const json = (await res.json().catch(() => ({}))) as {
      output?: { type: string; content?: { type: string; text?: string }[] }[];
      usage?: { input_tokens?: number; output_tokens?: number };
      error?: { message?: string };
    };
    if (!res.ok) throw new RecognitionError(`OpenAI HTTP ${res.status}: ${json.error?.message ?? res.statusText}`, 'provider_error');
    const text = json.output?.find((o) => o.type === 'message')?.content?.find((c) => c.type === 'output_text')?.text;
    if (!text) throw new RecognitionError('OpenAI returned no listing text', 'bad_output');
    const raw = JSON.parse(text) as {
      title: string;
      description: string;
      condition_text: string;
      keywords: string[];
      item: { brand: string | null; type: string; colour: string | null };
      missing: string[];
    };
    const inputTokens = json.usage?.input_tokens ?? 0;
    const outputTokens = json.usage?.output_tokens ?? 0;
    const price = PRICING[this.model];
    return {
      title: raw.title.trim(),
      description: raw.description.trim(),
      conditionText: raw.condition_text.trim(),
      keywords: raw.keywords.map((k) => k.trim()).filter(Boolean),
      item: raw.item,
      missing: raw.missing.map((m) => m.trim()).filter(Boolean).slice(0, 4),
      usage: { inputTokens, outputTokens },
      ...(price && { costUsd: (inputTokens * price[0] + outputTokens * price[1]) / 1_000_000 }),
      modelVersion: `${this.id}@listing-photo-v1`,
    };
  }

  async write(input: ListingInput): Promise<ListingText> {
    if (!this.isConfigured()) throw new RecognitionError('OPENAI_API_KEY is not set', 'not_configured');
    const system = `You write second-hand marketplace listings for European resellers. Write in the language with ISO code "${input.language}".
${STYLE[input.marketplace]}
Rules: never invent specs, accessories or defects that are not given; if something is unknown, leave it out. Do not mention the price in the text.
condition_text: one honest sentence about the condition. keywords: 5-10 search terms buyers would type.`;
    const facts = [
      `Item: ${input.brand} ${input.model}${input.capacity ? ` ${input.capacity}` : ''}`,
      `Category: ${input.category}`,
      `Condition: ${input.condition.replace(/_/g, ' ')}`,
      `Seller: ${input.sellerType}`,
      input.notes ? `Seller notes: ${input.notes}` : 'Seller notes: none',
    ].join('\n');

    let res: Response;
    try {
      res = await this.fetchImpl('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          store: false,
          input: [
            { role: 'system', content: system },
            { role: 'user', content: [{ type: 'input_text', text: facts }] },
          ],
          text: { format: { type: 'json_schema', name: 'listing', schema: SCHEMA, strict: true } },
        }),
        signal: AbortSignal.timeout(45_000),
      });
    } catch (e) {
      throw new RecognitionError(`OpenAI request failed: ${e instanceof Error ? e.message : String(e)}`, 'provider_error');
    }
    const json = (await res.json().catch(() => ({}))) as {
      output?: { type: string; content?: { type: string; text?: string }[] }[];
      usage?: { input_tokens?: number; output_tokens?: number };
      error?: { message?: string };
    };
    if (!res.ok) throw new RecognitionError(`OpenAI HTTP ${res.status}: ${json.error?.message ?? res.statusText}`, 'provider_error');
    const text = json.output?.find((o) => o.type === 'message')?.content?.find((c) => c.type === 'output_text')?.text;
    if (!text) throw new RecognitionError('OpenAI returned no listing text', 'bad_output');
    const raw = JSON.parse(text) as { title: string; description: string; condition_text: string; keywords: string[] };
    const inputTokens = json.usage?.input_tokens ?? 0;
    const outputTokens = json.usage?.output_tokens ?? 0;
    const price = PRICING[this.model];
    return {
      title: raw.title.trim(),
      description: raw.description.trim(),
      conditionText: raw.condition_text.trim(),
      keywords: raw.keywords.map((k) => k.trim()).filter(Boolean),
      usage: { inputTokens, outputTokens },
      ...(price && { costUsd: (inputTokens * price[0] + outputTokens * price[1]) / 1_000_000 }),
      modelVersion: `${this.id}@listing-v1`,
    };
  }
}
