import { CATEGORIES, CONDITIONS, type CategorySlug, type Condition } from '@fliplens/core';
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

export const PROMPT_VERSION = 'prompt-v1';

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
Supported categories: consumer electronics, gaming, cameras and lenses, power tools.

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
- If the photo shows no identifiable product, return an empty candidates list.`;

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
        required: ['category', 'brand', 'model', 'family', 'generation', 'variant', 'capacity', 'colour', 'mount', 'gtin', 'confidence'],
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
    if (!this.isConfigured()) throw new RecognitionError('OPENAI_API_KEY is not set', 'not_configured');
    const started = Date.now();

    const body = {
      model: this.model,
      store: false,
      input: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'input_text', text: `Identify the product in ${images.length === 1 ? 'this photo' : `these ${images.length} photos (same item)`}.` },
            ...images.map((img) => ({ type: 'input_image', image_url: img.dataUrl, detail: 'high' })),
          ],
        },
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
  if (!r.brand.trim() || !r.model.trim()) return undefined;
  const category = (CATEGORIES as readonly string[]).includes(r.category) ? (r.category as CategorySlug) : 'other';
  const opt = (k: 'family' | 'generation' | 'variant' | 'capacity' | 'colour' | 'mount', v: string | null) =>
    v && v.trim() ? { [k]: v.trim() } : {};
  const gtin = r.gtin?.replace(/\D/g, '');
  return {
    category,
    brand: r.brand.trim(),
    model: r.model.trim(),
    ...opt('family', r.family),
    ...opt('generation', r.generation),
    ...opt('variant', r.variant),
    ...opt('capacity', r.capacity),
    ...opt('colour', r.colour),
    ...opt('mount', r.mount),
    ...(gtin && /^\d{8,14}$/.test(gtin) && { gtin }),
    confidence: Math.min(1, Math.max(0, r.confidence)),
  };
}
