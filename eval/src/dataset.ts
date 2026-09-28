import { mkdir, readFile, appendFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { CategorySlug, Condition } from '@fliplens/core';

/**
 * Benchmark dataset: eval/dataset/items.jsonl (one item per line) + eval/dataset/images/<id>/<n>.jpg.
 * Images are git-ignored (they may show people's homes); items.jsonl is committed.
 * Schema: eval/dataset/item.schema.json
 */

export const DATASET_DIR = fileURLToPath(new URL('../dataset/', import.meta.url));
export const ITEMS_FILE = `${DATASET_DIR}items.jsonl`;
export const REPORTS_DIR = fileURLToPath(new URL('../reports/', import.meta.url));

export interface BenchmarkTruth {
  brand: string;
  model: string;
  family?: string | null;
  generation?: string | null;
  variant?: string | null;
  capacity?: string | null;
  colour?: string | null;
  mount?: string | null;
  gtin?: string | null;
}

export interface MarketRange {
  low: number;
  high: number;
  /** "sold" = real sale prices (the ground truth we want), "asking" = only listings were available. */
  kind: 'sold' | 'asking' | 'mixed';
  captured_at: string; // YYYY-MM-DD
}

export interface BenchmarkItem {
  id: string;
  category: CategorySlug;
  truth: BenchmarkTruth;
  condition: Condition;
  images: string[]; // relative to DATASET_DIR
  photo_context?: 'in_hand_shop_light' | 'on_table' | 'boxed' | 'label_visible' | 'poor_light';
  hypothetical_purchase_price_eur: number;
  market_range_eur: MarketRange;
  reference_urls?: string[];
  difficulty?: 'easy' | 'medium' | 'hard_pair';
  notes?: string;
  created_at?: string;
}

const PREFIX: Record<CategorySlug, 'el' | 'gm' | 'cm' | 'tl'> = {
  headphones: 'el', smartphones: 'el', tablets: 'el', laptops: 'el', smartwatches: 'el', speakers: 'el',
  routers: 'el', streaming: 'el',
  consoles: 'gm', handhelds: 'gm', controllers: 'gm', games: 'gm',
  camera_bodies: 'cm', lenses: 'cm', action_cameras: 'cm', compact_cameras: 'cm',
  power_tools: 'tl', other: 'tl',
};

export async function loadItems(): Promise<BenchmarkItem[]> {
  if (!existsSync(ITEMS_FILE)) return [];
  const text = await readFile(ITEMS_FILE, 'utf8');
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l, i) => {
      try {
        return JSON.parse(l) as BenchmarkItem;
      } catch {
        throw new Error(`items.jsonl line ${i + 1} is not valid JSON`);
      }
    });
}

function nextId(items: readonly BenchmarkItem[], category: CategorySlug): string {
  const prefix = PREFIX[category];
  const max = items
    .map((i) => i.id.match(new RegExp(`^${prefix}-(\\d{3})$`))?.[1])
    .filter((n): n is string => n !== undefined)
    .reduce((m, n) => Math.max(m, Number(n)), 0);
  return `${prefix}-${String(max + 1).padStart(3, '0')}`;
}

export type NewBenchmarkItem = Omit<BenchmarkItem, 'id' | 'images' | 'created_at'>;

/** Appends an item and writes its JPEG images. Returns the stored item. */
export async function addItem(input: NewBenchmarkItem, jpegImages: readonly Buffer[]): Promise<BenchmarkItem> {
  const items = await loadItems();
  const id = nextId(items, input.category);
  const dir = `${DATASET_DIR}images/${id}/`;
  await mkdir(dir, { recursive: true });
  const images: string[] = [];
  for (const [i, buf] of jpegImages.entries()) {
    const rel = `images/${id}/${i + 1}.jpg`;
    await writeFile(`${DATASET_DIR}${rel}`, buf);
    images.push(rel);
  }
  const item: BenchmarkItem = { id, ...input, images, created_at: new Date().toISOString() };
  await mkdir(DATASET_DIR, { recursive: true });
  await appendFile(ITEMS_FILE, `${JSON.stringify(item)}\n`, 'utf8');
  return item;
}

export async function imageDataUrls(item: BenchmarkItem): Promise<string[]> {
  return Promise.all(
    item.images.map(async (rel) => `data:image/jpeg;base64,${(await readFile(`${DATASET_DIR}${rel}`)).toString('base64')}`),
  );
}
