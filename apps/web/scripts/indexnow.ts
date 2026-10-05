/**
 * Tells Bing (which powers ChatGPT search), Yandex, Seznam and other IndexNow engines that pages changed.
 * Run after a deploy that changed public pages: pnpm --filter @fliplens/web indexnow
 * The key file public/4ba7faf75aebaa1839a791392e05e800.txt proves we own fliplens.eu.
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const KEY = '4ba7faf75aebaa1839a791392e05e800';
const here = dirname(fileURLToPath(import.meta.url));
const urls = [...readFileSync(resolve(here, '../public/sitemap.xml'), 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]!);
const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: 'fliplens.eu', key: KEY, keyLocation: `https://fliplens.eu/${KEY}.txt`, urlList: urls }),
});
console.log(`IndexNow: HTTP ${res.status} for ${urls.length} URLs`, res.status >= 300 ? await res.text() : '');
