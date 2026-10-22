// Builds the Chrome extension (Manifest V3) into dist/: bundles the scripts with esbuild and writes manifest.json.
// FLIPLENS_URL picks the FlipLens origin the extension talks to (default production; `pnpm dev` uses the Vite dev server).
import { context } from 'esbuild';
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const dist = new URL('dist/', root);
const appUrl = new URL(process.env.FLIPLENS_URL || 'https://fliplens.eu').origin;
const watch = process.argv.includes('--watch');
const { version } = JSON.parse(readFileSync(new URL('package.json', root), 'utf8'));

/** Every European Vinted site (one per country, same page layout everywhere). */
const VINTED = ['at', 'be', 'co.uk', 'cz', 'de', 'dk', 'es', 'fi', 'fr', 'gr', 'hr', 'hu', 'ie', 'it', 'lt', 'lu', 'nl', 'pl', 'pt', 'ro', 'se', 'si', 'sk'];
const EBAY = ['www.ebay.de', 'www.ebay.at', 'www.ebay.ch', 'www.ebay.fr', 'www.ebay.it', 'www.ebay.es', 'www.ebay.nl', 'befr.ebay.be', 'benl.ebay.be', 'www.ebay.co.uk', 'www.ebay.ie', 'www.ebay.pl'];
/** Pages the listing script runs on; src/sites.ts has an adapter for each. Single-page sites need the whole site. */
const LISTING_PAGES = [
  ...VINTED.map((d) => `https://www.vinted.${d}/*`),
  'https://www.kleinanzeigen.de/s-anzeige/*',
  'https://www.subito.it/*',
  'https://www.leboncoin.fr/*',
  ...['es', 'it', 'pt', 'www'].map((s) => `https://${s}.wallapop.com/*`),
  ...['www.marktplaats.nl', 'www.2dehands.be', 'www.2ememain.be'].map((h) => `https://${h}/v/*`),
  'https://www.willhaben.at/iad/kaufen-und-verkaufen/d/*',
  ...EBAY.map((h) => `https://${h}/itm/*`),
];

const manifest = {
  manifest_version: 3,
  name: 'FlipLens: resale profit checker',
  short_name: 'FlipLens',
  version,
  // Chrome Web Store limit: 132 characters.
  description: 'Is this listing worth buying to resell? Resale value, profit and max price on Vinted, eBay, Kleinanzeigen, Wallapop and more.',
  icons: { 16: 'icons/icon-16.png', 32: 'icons/icon-32.png', 48: 'icons/icon-48.png', 128: 'icons/icon-128.png' },
  action: { default_popup: 'popup.html', default_icon: { 16: 'icons/icon-16.png', 32: 'icons/icon-32.png' } },
  background: { service_worker: 'background.js', type: 'module' },
  permissions: ['storage'],
  host_permissions: [`${appUrl}/*`],
  content_scripts: [
    {
      // The panel shows on listing pages only; single-page sites change pages without loading the script again.
      matches: LISTING_PAGES,
      js: ['listing.js'],
      run_at: 'document_idle',
    },
    { matches: [`${appUrl}/*`], js: ['app-session.js'], run_at: 'document_idle' },
  ],
};

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
cpSync(new URL('static/', root), dist, { recursive: true });
writeFileSync(new URL('manifest.json', dist), JSON.stringify(manifest, null, 2));

const common = {
  bundle: true,
  target: 'chrome120',
  outdir: dist.pathname,
  define: { __APP_URL__: JSON.stringify(appUrl) },
  logLevel: 'info',
};
const contexts = await Promise.all([
  context({ ...common, entryPoints: { background: 'src/background.ts' }, format: 'esm' }),
  // Content scripts and the popup are classic scripts: one self-contained file each.
  context({ ...common, entryPoints: { listing: 'src/listing.ts', 'app-session': 'src/app-session.ts', popup: 'src/popup.ts' }, format: 'iife' }),
]);
if (watch) {
  await Promise.all(contexts.map((c) => c.watch()));
  console.log(`watching, FlipLens at ${appUrl}`);
} else {
  await Promise.all(contexts.map((c) => c.rebuild()));
  await Promise.all(contexts.map((c) => c.dispose()));
  console.log(`built dist/ for ${appUrl}`);
}
