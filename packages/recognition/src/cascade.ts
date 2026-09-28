import type { IdentificationResult, ImageInput, VisionProvider } from './types.js';

/**
 * Cost control: a cheap model answers first; only when it is unsure (top confidence below `threshold`, or nothing
 * recognised) the strong model is asked. Usage and cost of both calls are summed into the result.
 */
export class CascadeVisionProvider implements VisionProvider {
  readonly id: string;

  constructor(
    private readonly fast: VisionProvider,
    private readonly strong: VisionProvider,
    private readonly threshold = 0.8,
  ) {
    this.id = `cascade:${fast.id}>${strong.id}`;
  }

  isConfigured(): boolean {
    return this.fast.isConfigured() && this.strong.isConfigured();
  }

  async identify(images: readonly ImageInput[], opts?: { readonly requestId?: string }): Promise<IdentificationResult> {
    const first = await this.fast.identify(images, opts);
    const top = first.candidates[0]?.confidence ?? 0;
    if (top >= this.threshold) return first;

    const second = await this.strong.identify(images, opts);
    return {
      ...second,
      escalatedFrom: first.modelVersion,
      usage: {
        inputTokens: first.usage.inputTokens + second.usage.inputTokens,
        outputTokens: first.usage.outputTokens + second.usage.outputTokens,
      },
      ...((first.costUsd !== undefined || second.costUsd !== undefined) && { costUsd: (first.costUsd ?? 0) + (second.costUsd ?? 0) }),
      latencyMs: first.latencyMs + second.latencyMs,
    };
  }
}
