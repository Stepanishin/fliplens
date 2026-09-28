/**
 * Benchmark runner: identification accuracy per vision model + pricing error vs manual market ranges.
 *
 *   pnpm eval                                   # all items, models from EVAL_MODELS or gpt-6-sol,gpt-6-luna
 *   pnpm eval -- --models gpt-6-luna --limit 10
 *   pnpm eval -- --skip-vision                   # pricing only (no OpenAI cost)
 *   pnpm eval -- --skip-pricing --only el-003
 *
 * Writes eval/reports/<timestamp>.md (committed) and <timestamp>.raw.json (git-ignored).
 */
import { mkdir, writeFile } from 'node:fs/promises';
import {
  DEFAULT_PRICING_CONFIG,
  FEE_PRESETS,
  PRICING_ALGORITHM_VERSION,
  compact,
  computeProfit,
  decide,
  estimatePrice,
  matchTitle,
  money,
  toMajor,
  type Decision,
  type NormalizedProduct,
} from '@fliplens/core';
import { OpenAIVisionProvider, type IdentificationCandidate, type IdentificationResult } from '@fliplens/recognition';
import { EbayAdapter, EcbFxService } from '@fliplens/sources';
import { REPORTS_DIR, imageDataUrls, loadItems, type BenchmarkItem } from './dataset.js';

// ---------- args ----------
const argv = process.argv.slice(2);
const flag = (name: string): boolean => argv.includes(`--${name}`);
const opt = (name: string): string | undefined => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
};
const models = (opt('models') ?? process.env.EVAL_MODELS ?? 'gpt-6-sol,gpt-6-luna').split(',').map((s) => s.trim()).filter(Boolean);
const limit = opt('limit') ? Number(opt('limit')) : undefined;
const only = opt('only');
const skipVision = flag('skip-vision');
const skipPricing = flag('skip-pricing');

// ---------- scoring ----------
type IdScore = 'exact' | 'near' | 'wrong' | 'none';

function truthProduct(item: BenchmarkItem): NormalizedProduct {
  const t = item.truth;
  return {
    category: item.category,
    brand: t.brand,
    model: t.model,
    ...(t.variant && { variant: t.variant }),
    ...(t.capacity && { capacity: t.capacity }),
    ...(t.mount && { mount: t.mount }),
    ...(t.gtin && { gtin: t.gtin }),
  };
}

/** Reuses the comparable matcher: a candidate is right when it would be accepted as a comparable for the truth. */
function scoreCandidate(item: BenchmarkItem, c: IdentificationCandidate | undefined): IdScore {
  if (!c) return 'none';
  const t = item.truth;
  const b1 = compact(c.brand);
  const b2 = compact(t.brand);
  if (!(b1 === b2 || b1.includes(b2) || b2.includes(b1))) return 'wrong';
  const asTitle = [c.brand, c.model, c.capacity, c.mount].filter(Boolean).join(' ');
  if (matchTitle(truthProduct(item), asTitle).reason !== undefined) return 'wrong';
  const capOk = !t.capacity || (c.capacity !== undefined && compact(c.capacity) === compact(t.capacity));
  const mountOk = !t.mount || (c.mount !== undefined && compact(c.mount) === compact(t.mount));
  return capOk && mountOk ? 'exact' : 'near';
}

interface VisionRow {
  model: string;
  top?: string;
  confidence?: number;
  score: IdScore;
  inTop3: boolean;
  costUsd: number;
  latencyMs: number;
  error?: string;
}

interface PricingRow {
  status: 'ok' | 'insufficient_data' | 'error';
  included?: number;
  medianAsking?: number;
  expected?: number;
  fast?: number;
  high?: number;
  confidence?: string;
  mid: number;
  apePct?: number;
  inRange?: boolean;
  decision?: Decision;
  truthDecision?: Decision;
  error?: string;
}

interface Row {
  item: BenchmarkItem;
  vision: VisionRow[];
  pricing?: PricingRow;
}

async function mapLimit<T, R>(xs: readonly T[], n: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(xs.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, xs.length) }, async () => {
      while (next < xs.length) {
        const i = next++;
        out[i] = await fn(xs[i]!);
      }
    }),
  );
  return out;
}

// ---------- run ----------
async function main(): Promise<void> {
  let items = await loadItems();
  if (only) items = items.filter((i) => i.id === only);
  if (limit !== undefined) items = items.slice(0, limit);
  if (items.length === 0) {
    console.log('No benchmark items. Add some with "Add to benchmark" in the app (eval/dataset/items.jsonl).');
    return;
  }
  console.log(`Benchmark: ${items.length} items · vision: ${skipVision ? 'skip' : models.join(', ')} · pricing: ${skipPricing ? 'skip' : PRICING_ALGORITHM_VERSION}`);

  const apiKey = process.env.OPENAI_API_KEY ?? '';
  if (!skipVision && !apiKey) throw new Error('OPENAI_API_KEY missing (or use --skip-vision)');
  const providers = skipVision ? [] : models.map((m) => new OpenAIVisionProvider({ apiKey, model: m }));
  const ebay = new EbayAdapter({ clientId: process.env.EBAY_CLIENT_ID ?? '', clientSecret: process.env.EBAY_CLIENT_SECRET ?? '' });
  if (!skipPricing && !ebay.isConfigured()) throw new Error('eBay keys missing (or use --skip-pricing)');
  const fx = await new EcbFxService().latest();

  const rows: Row[] = await mapLimit(items, 3, async (item): Promise<Row> => {
    const vision: VisionRow[] = [];
    if (providers.length > 0) {
      const images = await imageDataUrls(item);
      for (const p of providers) {
        const model = p.id.replace('openai:', '');
        try {
          const r: IdentificationResult = await p.identify(images.map((dataUrl) => ({ dataUrl })));
          const top = r.candidates[0];
          vision.push({
            model,
            ...(top && { top: `${top.brand} ${top.model}${top.capacity ? ` ${top.capacity}` : ''}`, confidence: top.confidence }),
            score: scoreCandidate(item, top),
            inTop3: r.candidates.some((c) => ['exact', 'near'].includes(scoreCandidate(item, c))),
            costUsd: r.costUsd ?? 0,
            latencyMs: r.latencyMs,
          });
        } catch (e) {
          vision.push({ model, score: 'none', inTop3: false, costUsd: 0, latencyMs: 0, error: e instanceof Error ? e.message : String(e) });
        }
      }
    }

    let pricing: PricingRow | undefined;
    if (!skipPricing) {
      const range = item.market_range_eur;
      const mid = (range.low + range.high) / 2;
      try {
        const product = truthProduct(item);
        const search = await ebay.searchProduct(product);
        const est = estimatePrice({
          product,
          targetCondition: item.condition,
          items: search.items,
          targetCurrency: 'EUR',
          fx,
          now: new Date(),
          identificationConfidence: 1,
        });
        if (est.status !== 'ok') {
          pricing = { status: 'insufficient_data', included: est.includedCount, mid };
        } else {
          const expected = toMajor(est.expected);
          const fees = FEE_PRESETS.ebay_de_private;
          const shipping = money(6, 'EUR');
          const purchase = money(item.hypothetical_purchase_price_eur, 'EUR');
          const decisionFor = (sale: number): Decision => {
            const p = computeProfit({ salePrice: money(sale, 'EUR'), purchasePrice: purchase, fees, shippingCost: shipping });
            return decide(
              { profit: p.profit, roiPct: p.roiPct, confidence: est.confidence, includedCount: est.distribution.count, dataKind: est.dataKind },
              DEFAULT_PRICING_CONFIG,
            ).decision;
          };
          pricing = {
            status: 'ok',
            included: est.distribution.count,
            medianAsking: est.distribution.median / 100,
            expected,
            fast: toMajor(est.fast),
            high: toMajor(est.high),
            confidence: est.confidence.level,
            mid,
            apePct: (Math.abs(expected - mid) / mid) * 100,
            inRange: expected >= range.low && expected <= range.high,
            decision: decisionFor(expected),
            truthDecision: decisionFor(mid),
          };
        }
      } catch (e) {
        pricing = { status: 'error', mid, error: e instanceof Error ? e.message : String(e) };
      }
    }
    const v = vision.map((x) => `${x.model}:${x.score}`).join(' ');
    const pr = pricing ? (pricing.status === 'ok' ? `€${pricing.expected} vs €${pricing.mid} (${pricing.apePct!.toFixed(0)}%)` : pricing.status) : '';
    console.log(`  ${item.id} ${item.truth.brand} ${item.truth.model}  ${v}  ${pr}`);
    return { item, vision, ...(pricing && { pricing }) };
  });

  const report = buildReport(rows);
  await mkdir(REPORTS_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  await writeFile(`${REPORTS_DIR}${stamp}.md`, report);
  await writeFile(`${REPORTS_DIR}${stamp}.raw.json`, JSON.stringify(rows, null, 2));
  console.log(`\n${report}\nReport: eval/reports/${stamp}.md`);
}

// ---------- report ----------
const pct = (n: number, d: number): string => (d === 0 ? 'n/a' : `${Math.round((n / d) * 100)}%`);
const median = (xs: number[]): number | undefined => {
  if (xs.length === 0) return undefined;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
};
const GROUP: Record<string, string> = { el: 'electronics', gm: 'gaming', cm: 'cameras', tl: 'tools/other' };

function buildReport(rows: readonly Row[]): string {
  const out: string[] = [];
  out.push(`# Benchmark report ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`);
  out.push('');
  out.push(`Items: ${rows.length} · pricing ${PRICING_ALGORITHM_VERSION}`);
  out.push('');

  const modelsRun = [...new Set(rows.flatMap((r) => r.vision.map((v) => v.model)))];
  if (modelsRun.length > 0) {
    out.push('## Identification (gate: exact + near > 80% for Tier 1)');
    out.push('');
    out.push('| Model | Exact | Near | Exact+near | In top 3 | Wrong | Errors | Cost total | Cost / scan | p50 latency |');
    out.push('|---|---|---|---|---|---|---|---|---|---|');
    for (const m of modelsRun) {
      const vs = rows.map((r) => r.vision.find((v) => v.model === m)).filter((v): v is VisionRow => v !== undefined);
      const n = vs.length;
      const ex = vs.filter((v) => v.score === 'exact').length;
      const ne = vs.filter((v) => v.score === 'near').length;
      const cost = vs.reduce((a, v) => a + v.costUsd, 0);
      out.push(
        `| ${m} | ${pct(ex, n)} | ${pct(ne, n)} | **${pct(ex + ne, n)}** | ${pct(vs.filter((v) => v.inTop3).length, n)} | ${pct(vs.filter((v) => v.score === 'wrong').length, n)} | ${vs.filter((v) => v.error).length} | $${cost.toFixed(3)} | $${(cost / Math.max(1, n)).toFixed(4)} | ${((median(vs.map((v) => v.latencyMs)) ?? 0) / 1000).toFixed(1)}s |`,
      );
    }
    out.push('');
    out.push('Calibration (top candidate): accuracy by confidence bin');
    out.push('');
    out.push('| Model | <0.6 | 0.6-0.85 | ≥0.85 |');
    out.push('|---|---|---|---|');
    for (const m of modelsRun) {
      const vs = rows.map((r) => r.vision.find((v) => v.model === m)).filter((v): v is VisionRow => v?.confidence !== undefined);
      const bin = (lo: number, hi: number): string => {
        const b = vs.filter((v) => v.confidence! >= lo && v.confidence! < hi);
        return `${pct(b.filter((v) => v.score === 'exact' || v.score === 'near').length, b.length)} (n=${b.length})`;
      };
      out.push(`| ${m} | ${bin(0, 0.6)} | ${bin(0.6, 0.85)} | ${bin(0.85, 1.01)} |`);
    }
    out.push('');
    out.push('By category (exact+near)');
    out.push('');
    out.push(`| Group | n | ${modelsRun.join(' | ')} |`);
    out.push(`|---|---|${modelsRun.map(() => '---').join('|')}|`);
    for (const [prefix, name] of Object.entries(GROUP)) {
      const g = rows.filter((r) => r.item.id.startsWith(prefix));
      if (g.length === 0) continue;
      const cells = modelsRun.map((m) => {
        const vs = g.map((r) => r.vision.find((v) => v.model === m)).filter((v): v is VisionRow => v !== undefined);
        return pct(vs.filter((v) => v.score === 'exact' || v.score === 'near').length, vs.length);
      });
      out.push(`| ${name} | ${g.length} | ${cells.join(' | ')} |`);
    }
    out.push('');
  }

  const priced = rows.filter((r) => r.pricing);
  if (priced.length > 0) {
    const ok = priced.filter((r) => r.pricing!.status === 'ok');
    const apes = ok.map((r) => r.pricing!.apePct!);
    const sold = ok.filter((r) => r.item.market_range_eur.kind === 'sold');
    const ratios = sold.map((r) => r.pricing!.mid / r.pricing!.medianAsking!);
    const falseStrong = ok.filter((r) => r.pricing!.decision === 'strong_buy' && ['borderline', 'skip'].includes(r.pricing!.truthDecision!));
    out.push('## Pricing (gate: <10% of estimates off by more than 50%)');
    out.push('');
    out.push('| Metric | Value |');
    out.push('|---|---|');
    out.push(`| Valued (≥5 comparables) | ${pct(ok.length, priced.length)} (${ok.length}/${priced.length}) |`);
    out.push(`| Median abs. error | ${median(apes)?.toFixed(0) ?? 'n/a'}% |`);
    out.push(`| Expected inside market range | ${pct(ok.filter((r) => r.pricing!.inRange).length, ok.length)} |`);
    out.push(`| Error > 50% | **${pct(apes.filter((a) => a > 50).length, ok.length)}** |`);
    out.push(`| False STRONG BUY (truth says borderline/skip) | ${falseStrong.length} |`);
    out.push(
      `| Suggested asking→sold ratio (sold ranges only) | ${median(ratios)?.toFixed(2) ?? 'n/a'} (current ${DEFAULT_PRICING_CONFIG.askingToSoldRatio.default}, n=${ratios.length}) |`,
    );
    out.push('');
  }

  out.push('## Items');
  out.push('');
  out.push(`| ID | Truth | ${[...new Set(rows.flatMap((r) => r.vision.map((v) => v.model)))].join(' | ')} | Market | Expected | Error | Decision (truth) |`);
  out.push(`|---|---|${rows[0]?.vision.map(() => '---|').join('') ?? ''}---|---|---|---|`);
  for (const r of rows) {
    const t = r.item.truth;
    const vcells = r.vision.map((v) => (v.error ? `error` : `${v.score}: ${v.top ?? '-'} (${v.confidence?.toFixed(2) ?? '-'})`));
    const p = r.pricing;
    const m = r.item.market_range_eur;
    out.push(
      `| ${r.item.id} | ${t.brand} ${t.model}${t.capacity ? ` ${t.capacity}` : ''} | ${vcells.join(' | ')}${vcells.length ? ' | ' : ''}€${m.low}-${m.high} ${m.kind} | ${p?.status === 'ok' ? `€${p.expected} (n=${p.included})` : (p?.status ?? '-')} | ${p?.apePct !== undefined ? `${p.apePct.toFixed(0)}%` : '-'} | ${p?.decision ? `${p.decision} (${p.truthDecision})` : '-'} |`,
    );
  }
  out.push('');
  return out.join('\n');
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
