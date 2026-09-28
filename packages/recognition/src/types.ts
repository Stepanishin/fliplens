import type { CategorySlug, Condition } from '@fliplens/core';

export interface ImageInput {
  /** data:image/jpeg;base64,... (client resizes to ~1MP before upload). */
  readonly dataUrl: string;
}

export interface IdentificationCandidate {
  readonly category: CategorySlug;
  readonly brand: string;
  readonly model: string;
  readonly family?: string;
  readonly generation?: string;
  readonly variant?: string;
  readonly capacity?: string;
  readonly colour?: string;
  readonly mount?: string;
  readonly gtin?: string;
  /** 0..1, calibrated on the benchmark later. */
  readonly confidence: number;
}

export interface IdentificationResult {
  /** Best first, at most 3. Empty if nothing recognisable. */
  readonly candidates: readonly IdentificationCandidate[];
  /** Sibling models that are easy to confuse with the top candidate (fed to the comparable matcher). */
  readonly confusableModels: readonly string[];
  readonly conditionGuess?: Condition;
  readonly conditionNotes?: string;
  /** Text read from the item: model numbers, labels, EAN. */
  readonly identifyingText: readonly string[];
  readonly provider: string;
  /** e.g. "openai:gpt-6-sol@prompt-v1", stored as recognition_model_version. */
  readonly modelVersion: string;
  readonly usage: { readonly inputTokens: number; readonly outputTokens: number };
  /** Approximate cost of this call in USD; undefined if the model has no price entry. */
  readonly costUsd?: number;
  readonly latencyMs: number;
  /** Set when a cheaper model was tried first and was not confident enough. */
  readonly escalatedFrom?: string;
}

export interface IdentifyOptions {
  readonly requestId?: string;
  /** Over the user's AI budget: never escalate to an expensive model. */
  readonly cheapOnly?: boolean;
}

/** Vision/LLM provider abstraction: model costs and capabilities change, the rest of the system must not care. */
export interface VisionProvider {
  readonly id: string;
  isConfigured(): boolean;
  identify(images: readonly ImageInput[], opts?: IdentifyOptions): Promise<IdentificationResult>;
}

export class RecognitionError extends Error {
  constructor(
    message: string,
    readonly kind: 'not_configured' | 'provider_error' | 'refusal' | 'bad_output',
  ) {
    super(message);
    this.name = 'RecognitionError';
  }
}
