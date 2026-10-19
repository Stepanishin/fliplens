import { CATEGORIES, CONDITIONS, FASHION_CATEGORY_OF, FASHION_GENDERS, FASHION_KINDS, isFashion, isUnbranded, type CategorySlug, type Condition, type FashionGender, type FashionKind } from '@fliplens/core';
import {
  RecognitionError,
  type IdentificationCandidate,
  type IdentificationResult,
  type ImageInput,
  type VisionProvider,
} from './types.js';

/**
 * OpenAI Responses API vision provider with strict Structured Outputs.
 * Docs: https://developers.openai.com/api/docs/guides/images-vision , /guides/structured-outputs
 * `store: false` so images and answers are not retained for later retrieval on OpenAI's side.
 */

export const PROMPT_VERSION = 'prompt-v3';

/** USD per 1M tokens (input, output). From developers.openai.com/api/docs/models, 2026-09-23. */
const PRICING: Record<string, readonly [number, number]> = {
  'gpt-6-astra': [10, 50],
  'gpt-6-sol': [2, 10],
  'gpt-6-luna': [0.1, 0.5],
};

export interface OpenAIVisionConfig {
  readonly apiKey: string;
  readonly model?: string;
  readonly baseUrl?: string;
  readonly timeoutMs?: number;
  readonly fetchImpl?: typeof fetch;
}

const SYSTEM_PROMPT = `You identify second-hand products from photos for European resellers.
Supported categories: consumer electronics, gaming, cameras and lenses, power tools, fashion (clothing, shoes, bags, accessories), LEGO sets, books, vinyl records, CDs, and films (DVD, Blu-ray).

Rules:
- Identify the exact model and variant. Prefer text you can read (model numbers on labels, boxes, back plates, lens barrels, EAN/UPC) over visual similarity.
- Write brand and model the way they appear in marketplace listing titles, e.g. brand "Sony" model "WH-1000XM4"; brand "Nintendo" model "Switch OLED"; brand "Apple" model "iPhone 13"; brand "Canon" model "EOS R6".
- Lenses: model is the focal length and aperture as printed (e.g. "24-105mm F4L IS USM"), mount goes in "mount" (e.g. "RF", "EF", "EF-S", "FE").
- Do not put storage/capacity in "model"; use "capacity" (e.g. "128GB") and only when it is visible or printed. Never guess capacity.
- Give up to 3 candidates, best first. Use several candidates when generations or variants look alike (e.g. WH-1000XM3 / XM4 / XM5, Switch v1 / OLED).
- confidence is your probability (0 to 1) that the candidate is exactly right, including variant. Be honest; 0.95+ only when a model number is clearly readable.
- confusable_models: sibling models a buyer could mix up with the top candidate, written like "model".
- condition_guess: judge only visible wear; null if you cannot tell.
- identifying_text: every relevant piece of text you read on the item or box.
- If the photo shows no identifiable product, return an empty candidates list.

Fashion (category clothing, shoes, bags or accessories; garments, labels and tags count as identifiable products):
- brand: exactly as on the label, tag or logo (e.g. "Pull&Bear", "Levi's", "The North Face", "Zara"). If no brand is readable or recognisable, brand "" (never "Unknown").
- model: a short English description of the item as a buyer would search it, e.g. "cargo shorts", "graphic hoodie", "leather crossbody bag".
- fashion_kind: the item type from the list. gender: women, men, unisex or kids, from cut, size label and style; unisex only when truly unisex.
- style: only a named product line or style printed on the item or unmistakable (e.g. "Air Force 1", "501", "Nuptse", "Speedy 30", "Stan Smith"), else null. Do not invent one.
- capacity, mount, generation: null. variant: the size if printed (e.g. "M", "W32 L32", "EU 42"). colour: main colour.
- confidence: your probability that brand and item type are right (style too, if you give one).
- Non-fashion items: fashion_kind, gender and style are null.

LEGO, books, music and films (category lego, books, vinyl, cds or movies):
- LEGO: brand "LEGO", model = the set number as printed on the box or instructions (e.g. "75192"); if no number is visible, the set name. family = theme (e.g. "Star Wars"), variant = set name. Loose bricks or minifigures without a set: category other.
- Books: brand = author as on the cover (e.g. "J. K. Rowling"), model = title without subtitle, gtin = the ISBN-13 if readable.
- Music: category vinyl for LP/single records, cds for CDs. brand = artist, model = album title. variant: special pressing if printed (e.g. "180g", "Picture Disc").
- Films: category movies. brand = the format: "DVD", "Blu-ray" or "4K" (4K UHD Blu-ray). model = film or series title (with season if a series).
- gtin: the EAN/ISBN digits if readable. confidence: probability that the edition is right.`;

const TITLES_PROMPT = `You normalise product identity for European resellers from marketplace listing titles that all belong to ONE barcode (GTIN).
Titles are in several languages and contain noise (condition, shipping, "OVP", seller words). Ignore the noise.
- Return the product the barcode stands for. Most titles agree; ignore outliers.
- Brand and model the way marketplace titles write them (e.g. "Sony" + "WH-1000XM4", "Nintendo" + "Switch OLED", "Apple" + "iPhone 13").
- capacity only if the titles clearly agree on it (a barcode usually fixes storage and colour).
- Lenses: focal length and aperture as model, mount separately.
- confidence: how sure you are about the exact model and variant given the titles.
- confusable_models: sibling models that are easy to confuse. condition_guess: null. condition_notes: null.
- identifying_text: the 1-3 titles that best support your answer.
- If the titles disagree about what the product is, give several candidates.
- LEGO: brand "LEGO", model = set number. Books: brand = author, model = title. Music: brand = artist, model = album, category vinyl or cds. Films: brand = format ("DVD", "Blu-ray", "4K"), model = title, category movies.
- fashion_kind, gender and style: null unless the titles are clothing.`;

const nullableString = { type: ['string', 'null'] } as const;

const RESPONSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['candidates', 'confusable_models', 'condition_guess', 'condition_notes', 'identifying_text'],
  properties: {
    candidates: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['category', 'brand', 'model', 'family', 'generation', 'variant', 'capacity', 'colour', 'mount', 'gtin', 'fashion_kind', 'gender', 'style', 'confidence'],
        properties: {
          category: { type: 'string', enum: [...CATEGORIES] },
          brand: { type: 'string' },
          model: { type: 'string' },
          family: nullableString,
          generation: nullableString,
          variant: nullableString,
          capacity: nullableString,
          colour: nullableString,
          mount: nullableString,
          gtin: nullableString,
          fashion_kind: { type: ['string', 'null'], enum: [...FASHION_KINDS, null] },
          gender: { type: ['string', 'null'], enum: [...FASHION_GENDERS, null] },
          style: nullableString,
          confidence: { type: 'number' },
        },
      },
    },
    confusable_models: { type: 'array', items: { type: 'string' } },
    condition_guess: { type: ['string', 'null'], enum: [...CONDITIONS, null] },
    condition_notes: nullableString,
    identifying_text: { type: 'array', items: { type: 'string' } },
  },
} as const;

interface RawCandidate {
  category: string;
  brand: string;
  model: string;
  family: string | null;
  generation: string | null;
  variant: string | null;
  capacity: string | null;
  colour: string | null;
  mount: string | null;
  gtin: string | null;
  fashion_kind: string | null;
  gender: string | null;
  style: string | null;
  confidence: number;
}
interface RawResult {
  candidates: RawCandidate[];
  confusable_models: string[];
  condition_guess: string | null;
  condition_notes: string | null;
  identifying_text: string[];
}
interface ResponsesApiResponse {
  status?: string;
  output?: { type: string; content?: { type: string; text?: string; refusal?: string }[] }[];
  usage?: { input_tokens?: number; output_tokens?: number };
  error?: { message?: string } | null;
  incomplete_details?: { reason?: string } | null;
}

export class OpenAIVisionProvider implements VisionProvider {
  readonly id: string;
  private readonly model: string;
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly cfg: OpenAIVisionConfig) {
    this.model = cfg.model ?? 'gpt-6-sol';
    this.id = `openai:${this.model}`;
    this.fetchImpl = cfg.fetchImpl ?? fetch;
  }

  isConfigured(): boolean {
    return this.cfg.apiKey.length > 0;
  }

  async identify(images: readonly ImageInput[], _opts?: { readonly requestId?: string }): Promise<IdentificationResult> {
    return this.run(SYSTEM_PROMPT, [
      { type: 'input_text', text: `Identify the product in ${images.length === 1 ? 'this photo' : `these ${images.length} photos (same item)`}.` },
      ...images.map((img) => ({ type: 'input_image', image_url: img.dataUrl, detail: 'high' })),
    ]);
  }

  /**
   * Barcode flow: marketplace listing titles found for one GTIN > normalized product identity.
   * Text only, so a cheap model is enough.
   */
  async identifyFromListingTitles(gtin: string, titles: readonly string[]): Promise<IdentificationResult> {
    const list = titles.slice(0, 30).map((t, i) => `${i + 1}. ${t}`).join('\n');
    return this.run(TITLES_PROMPT, [
      { type: 'input_text', text: `Barcode (GTIN): ${gtin}\nListing titles found for this barcode on eBay:\n${list}` },
    ]);
  }

  private async run(system: string, userContent: readonly Record<string, unknown>[]): Promise<IdentificationResult> {
    if (!this.isConfigured()) throw new RecognitionError('OPENAI_API_KEY is not set', 'not_configured');
    const started = Date.now();

    const body = {
      model: this.model,
      store: false,
      input: [
        { role: 'system', content: system },
        { role: 'user', content: userContent },
      ],
      text: { format: { type: 'json_schema', name: 'product_identification', schema: RESPONSE_SCHEMA, strict: true } },
    };

    let res: Response;
    try {
      res = await this.fetchImpl(`${this.cfg.baseUrl ?? 'https://api.openai.com/v1'}/responses`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.cfg.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.cfg.timeoutMs ?? 60_000),
      });
    } catch (e) {
      throw new RecognitionError(`OpenAI request failed: ${e instanceof Error ? e.message : String(e)}`, 'provider_error');
    }

    const json = (await res.json().catch(() => ({}))) as ResponsesApiResponse;
    if (!res.ok) throw new RecognitionError(`OpenAI HTTP ${res.status}: ${json.error?.message ?? res.statusText}`, 'provider_error');
    if (json.status === 'incomplete') {
      throw new RecognitionError(`OpenAI response incomplete: ${json.incomplete_details?.reason ?? 'unknown'}`, 'bad_output');
    }

    const content = json.output?.find((o) => o.type === 'message')?.content ?? [];
    const refusal = content.find((c) => c.type === 'refusal')?.refusal;
    if (refusal) throw new RecognitionError(`Model refused: ${refusal}`, 'refusal');
    const text = content.find((c) => c.type === 'output_text')?.text;
    if (!text) throw new RecognitionError('OpenAI returned no output text', 'bad_output');

    let raw: RawResult;
    try {
      raw = JSON.parse(text) as RawResult;
    } catch {
      throw new RecognitionError('OpenAI output is not valid JSON', 'bad_output');
    }

    const inputTokens = json.usage?.input_tokens ?? 0;
    const outputTokens = json.usage?.output_tokens ?? 0;
    const price = PRICING[this.model];
    return {
      candidates: raw.candidates.slice(0, 3).map(toCandidate).filter((c): c is IdentificationCandidate => c !== undefined),
      confusableModels: raw.confusable_models.filter((m) => m.trim().length > 0),
      ...(isCondition(raw.condition_guess) && { conditionGuess: raw.condition_guess }),
      ...(raw.condition_notes && { conditionNotes: raw.condition_notes }),
      identifyingText: raw.identifying_text,
      provider: 'openai',
      modelVersion: `${this.id}@${PROMPT_VERSION}`,
      usage: { inputTokens, outputTokens },
      ...(price && { costUsd: (inputTokens * price[0] + outputTokens * price[1]) / 1_000_000 }),
      latencyMs: Date.now() - started,
    };
  }
}

function isCondition(v: string | null): v is Condition {
  return v !== null && (CONDITIONS as readonly string[]).includes(v);
}

function toCandidate(r: RawCandidate): IdentificationCandidate | undefined {
  const kind = (FASHION_KINDS as readonly string[]).includes(r.fashion_kind ?? '') ? (r.fashion_kind as FashionKind) : undefined;
  let category = (CATEGORIES as readonly string[]).includes(r.category) ? (r.category as CategorySlug) : 'other';
  if (kind && !isFashion(category)) category = FASHION_CATEGORY_OF[kind];
  // Fashion without a readable brand is still worth showing: the user can type the brand from the label.
  const brand = isFashion(category) && isUnbranded(r.brand) ? '' : r.brand.trim();
  if ((!brand && !isFashion(category)) || !r.model.trim()) return undefined;
  const gender = (FASHION_GENDERS as readonly string[]).includes(r.gender ?? '') ? (r.gender as FashionGender) : 'unisex';
  const opt = (k: 'family' | 'generation' | 'variant' | 'capacity' | 'colour' | 'mount', v: string | null) =>
    v && v.trim() ? { [k]: v.trim() } : {};
  const gtin = r.gtin?.replace(/\D/g, '');
  return {
    category,
    brand,
    model: r.model.trim(),
    ...opt('family', r.family),
    ...opt('generation', r.generation),
    ...opt('variant', r.variant),
    ...opt('capacity', r.capacity),
    ...opt('colour', r.colour),
    ...opt('mount', r.mount),
    ...(gtin && /^\d{8,14}$/.test(gtin) && { gtin }),
    ...(isFashion(category) && { fashion: { ...(kind && { kind }), gender, ...(r.style?.trim() && { style: r.style.trim() }) } }),
    confidence: Math.min(1, Math.max(0, r.confidence)),
  };
}
