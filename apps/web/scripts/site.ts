/**
 * Static, crawlable side of fliplens.eu: content pages, sitemap.xml, robots.txt, llms.txt / llms-full.txt and the
 * SEO block of index.html (meta, JSON-LD, prerendered landing text for crawlers that do not run JavaScript).
 *
 * One source for all of it, so prices and facts cannot drift apart: plans come from @fliplens/core.
 * Run: pnpm --filter @fliplens/web site   (also runs as part of `build`). Output is committed.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PLANS } from '@fliplens/core';
import { LEGAL } from '../src/legal.js';

const SITE = 'https://fliplens.eu';
const UPDATED = '2026-10-05';
const here = dirname(fileURLToPath(import.meta.url));
const PUBLIC = resolve(here, '../public');
const INDEX = resolve(here, '../index.html');

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const eur = (minor: number): string => `€${(minor / 100).toFixed(2).replace(/\.00$/, '')}`;
const strip = (html: string): string =>
  html
    .replace(/<li>/g, '- ')
    .replace(/<\/(p|li|h2|h3|tr|ul|ol|table)>/g, '\n')
    .replace(/<td>/g, ' | ')
    .replace(/<a href="([^"]+)">([^<]+)<\/a>/g, '$2 ($1)')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

interface Faq { q: string; a: string }
interface Section { h2: string; html: string }
interface Page {
  path: string;
  title: string;
  description: string;
  h1: string;
  lead: string;
  sections: Section[];
  faq?: Faq[];
  kind: 'page' | 'article';
  crumb: string;
  /** Call to action at the end; defaults to the price-check CTA. */
  cta?: string;
  parent?: { path: string; name: string };
}

const plans = Object.values(PLANS);
const paid = plans.filter((p) => p.priceMonthlyMinor > 0);
const planLine = plans.map((p) => `${p.name} at ${p.priceMonthlyMinor ? `${eur(p.priceMonthlyMinor)}/month` : '€0'}: ${p.features[0]!.toLowerCase().replace(/\s*\((.*)\)/, ', $1')}`).join('; ');

const CTA = `<p class="cta"><a class="btn" href="/">Check an item for free</a><span>10 free checks a month. Sign in with Google, no card needed.</span></p>`;

const LISTING_CTA = `<p class="cta"><a class="btn" href="/?tool=listing">Write my listing free</a><span>${PLANS.free.monthlyListings} free listings a month. Sign in with Google, no card needed.</span></p>`;

const COMMON_FAQ: Faq[] = [
  {
    q: 'What is FlipLens?',
    a: 'FlipLens is a web app for resellers in Europe. Take a photo, scan a barcode or type a model, and it tells you what the item resells for on eBay in Germany, France, Italy, Spain and the Netherlands, your profit after fees and shipping, the most you should pay, and a verdict: strong buy, buy, borderline or skip.',
  },
  {
    q: 'Where do the prices come from?',
    a: 'From active eBay listings in five EU countries, read through the official eBay API and converted to euro with ECB exchange rates. Asking prices are usually above what items finally sell for, so FlipLens adjusts them down and always shows how many listings an estimate is based on. You can open every listing it used.',
  },
  {
    q: 'Which items work best?',
    a: 'Consumer electronics, gaming and cameras: headphones, smartphones, tablets, laptops, smartwatches, speakers, consoles, handhelds, controllers, games, camera bodies, lenses, action and compact cameras, plus power tools. Fashion is not supported yet.',
  },
  {
    q: 'Do I need to enter a price?',
    a: 'No. Without a price FlipLens shows what the item sells for and the maximum price worth paying for your target return. With a price you get a verdict, profit and ROI for that exact deal.',
  },
  {
    q: 'What happens to my photos and data?',
    a: 'Photos are only used to identify the item and are never stored. Your checks are kept until you delete them, and you can export or delete everything from your profile at any time.',
  },
  {
    q: 'Is FlipLens affiliated with eBay?',
    a: 'No. FlipLens is independent and shows eBay data through the official eBay API. It does not buy, sell or ship anything.',
  },
];

const PAGES: Page[] = [
  {
    path: '/how-it-works',
    kind: 'page',
    crumb: 'How it works',
    title: 'How FlipLens estimates resale value and profit',
    description: 'How FlipLens identifies the exact product, finds comparable eBay listings in five EU countries, estimates resale value, subtracts fees and shipping, and decides strong buy, buy, borderline or skip.',
    h1: 'How FlipLens works',
    lead: 'FlipLens answers one question: "I can buy this for €X. Is it worth buying to resell?" Here is exactly how the answer is made, including where it can be wrong.',
    sections: [
      {
        h2: '1. Identify the exact product',
        html: '<p>You take a photo of the item or its label, scan the barcode on the box, or type the model. Photos are identified by an AI vision model; barcodes (EAN and UPC) are matched against marketplace listings. FlipLens looks for the details that change the price: model generation (WH-1000XM4 is not XM5), storage (128 GB is not 256 GB), lens mount (RF is not EF) and condition. You can correct anything before the check runs.</p>',
      },
      {
        h2: '2. Find comparable listings',
        html: '<p>FlipLens searches current eBay listings in Germany, France, Italy, Spain and the Netherlands through the official eBay API and converts prices to euro with European Central Bank rates. It then filters out what would distort the price: other models and variants, accessories sold on their own, bundles, broken or "for parts" items, duplicates and listings in a very different condition. You can see every listing that was used and why others were removed.</p>',
      },
      {
        h2: '3. Estimate the resale value',
        html: '<p>From the remaining listings FlipLens builds a price distribution adjusted to your item\'s condition and reports three numbers: a quick-sale price, the expected sale price and a high asking price. Because asking prices are usually above final sale prices, the estimate is adjusted down. Every estimate carries a confidence score based on how many listings matched, how much they agree and how well the product was identified.</p>',
      },
      {
        h2: '4. Calculate profit after fees',
        html: '<p>FlipLens subtracts the selling fees of the marketplace you sell on (for example eBay.de private or business, Vinted or local pickup), your shipping cost and the purchase price. The result is profit, return on investment (ROI) and the <strong>maximum price worth paying</strong> for your target ROI: max price = money you keep after fees and shipping ÷ (1 + target ROI).</p>',
      },
      {
        h2: '5. Give a verdict, or say it does not know',
        html: '<p>The verdict is strong buy, buy, borderline or skip, with the reasons and risks behind it. If fewer than five matching listings remain, or the product identification is too uncertain, FlipLens says "not enough market data" instead of inventing a number.</p>',
      },
      {
        h2: 'Known limits',
        html: '<ul><li>Prices are based on active listings (asking prices), not on confirmed sale prices.</li><li>Supply is visible (how many items are for sale and for how long), sell-through speed is not yet.</li><li>Fashion, collectibles and one-of-a-kind items are not supported.</li><li>Fees change: each fee profile shows when it was last checked and links to its source.</li></ul>',
      },
    ],
  },
  {
    path: '/pricing',
    kind: 'page',
    crumb: 'Pricing',
    title: `FlipLens pricing: free resale checks, Pro ${eur(PLANS.pro.priceMonthlyMinor)}, Reseller ${eur(PLANS.reseller.priceMonthlyMinor)}`,
    description: `Free: ${PLANS.free.monthlyValuations} resale checks a month. Pro ${eur(PLANS.pro.priceMonthlyMinor)}: ${PLANS.pro.monthlyValuations} checks and a listing generator. Reseller ${eur(PLANS.reseller.priceMonthlyMinor)}: up to ${PLANS.reseller.monthlyValuations.toLocaleString('en')} checks. Final prices, cancel anytime.`,
    h1: 'Simple pricing',
    lead: 'Start free. Upgrade when FlipLens pays for itself: one good find usually covers a month.',
    sections: [
      {
        h2: 'Plans',
        html: `<table><thead><tr><th>Plan</th><th>Price</th><th>Includes</th></tr></thead><tbody>${plans
          .map((p) => `<tr><td><strong>${esc(p.name)}</strong></td><td>${p.priceMonthlyMinor ? `${eur(p.priceMonthlyMinor)} / month` : 'Free'}</td><td>${p.features.map(esc).join('<br>')}</td></tr>`)
          .join('')}</tbody></table><p>Final prices, no hidden fees. Payments are handled by Stripe. Cancel anytime from the customer portal. EU consumers have a 14-day right of withdrawal, see the <a href="/terms">Terms</a>.</p>`,
      },
      {
        h2: 'What counts as a check',
        html: '<p>A check is one valuation: FlipLens looks up the market and calculates resale value, profit and a verdict. Recognising the item from a photo or barcode is included. Checks reset on the 1st of every month.</p>',
      },
    ],
    faq: [
      { q: 'Is there a free plan?', a: `Yes. ${PLANS.free.name} includes ${PLANS.free.features[0]!.toLowerCase()} with photo and barcode recognition, profit and ROI, and stock tracking. No card is needed.` },
      { q: 'What do the paid plans add?', a: paid.map((p) => `${p.name} (${eur(p.priceMonthlyMinor)}/month): ${p.features.join(', ').toLowerCase()}.`).join(' ') },
      { q: 'Can I cancel anytime?', a: 'Yes. Cancel in the customer portal from your profile; the plan stays active until the end of the paid month.' },
    ],
  },
  {
    path: '/faq',
    kind: 'page',
    crumb: 'FAQ',
    title: 'FlipLens FAQ: resale value checks for European resellers',
    description: 'Answers about FlipLens: where prices come from, which items and countries are supported, accuracy, privacy, pricing and installing the app.',
    h1: 'Frequently asked questions',
    lead: 'Short answers about how FlipLens works and what it can and cannot do.',
    sections: [],
    faq: [
      ...COMMON_FAQ,
      { q: 'Which countries does FlipLens cover?', a: 'Market data comes from eBay Germany, France, Italy, Spain and the Netherlands. Links to check prices yourself are available for Vinted, Kleinanzeigen and other marketplaces across the EU.' },
      { q: 'How accurate is the estimate?', a: 'It depends on the market. Every result shows a confidence score, how many listings it is based on and the risks. When there is not enough data, FlipLens says so instead of guessing. You can track your real sale prices in Stock and see how close the estimates were.' },
      { q: 'Which marketplaces are the fees calculated for?', a: 'eBay.de for private and business sellers, Vinted and local pickup with cash. Each fee profile shows when it was last checked.' },
      { q: 'Can FlipLens write my listing?', a: `Yes. Take a photo of any item, clothes included, and FlipLens writes a title, description and condition text in the style of Vinted, eBay or Kleinanzeigen, in your language, ready to copy. Free includes ${PLANS.free.monthlyListings} listings a month, Pro ${PLANS.pro.monthlyListings}. FlipLens never posts on your behalf.` },
      { q: 'Is there a mobile app?', a: 'FlipLens is a web app that installs on your phone: open fliplens.eu and choose "Add to Home Screen" (iPhone) or "Install app" (Android). It then opens full screen like a native app.' },
      { q: 'Why do I need to sign in?', a: 'Your free checks, history and plan belong to your account, so they work on all your devices. Sign in with Google in one tap; there is no password to create.' },
    ],
  },
  {
    path: '/guides/how-to-check-resale-value',
    kind: 'article',
    crumb: 'How to check resale value',
    parent: { path: '/guides', name: 'Guides' },
    title: 'How to check an item\'s resale value before you buy it (Europe)',
    description: 'A step-by-step method to find what a second-hand item really resells for in Europe, subtract fees and shipping, and work out the maximum price worth paying.',
    h1: 'How to check an item\'s resale value before you buy it',
    lead: 'At a flea market or on a classifieds site you usually have a minute to decide. This is the method resellers use, and the one FlipLens automates.',
    sections: [
      {
        h2: '1. Pin down the exact model',
        html: '<p>Price differences between variants are often bigger than between conditions. Read the model number on the label, the box or the settings screen. Check storage size, model generation, colour where it matters, and for lenses the mount. "Sony headphones" is not a price; "Sony WH-1000XM4" is.</p>',
      },
      {
        h2: '2. Look at comparable listings, not the first result',
        html: '<p>Search the exact model on eBay and filter out what does not compare: other generations, accessories sold alone, bundles with games or extra lenses, "for parts" items and listings from far away with expensive shipping. Look at several countries: the same item can sell for noticeably different prices in Germany, France or Italy.</p>',
      },
      {
        h2: '3. Correct for asking price and condition',
        html: '<p>Most listings show asking prices, and items usually sell for less. Take the middle of the realistic range, not the highest listing, and adjust for condition: a "good" item does not fetch a "like new" price. If only a handful of comparable listings exist, treat any estimate with caution.</p>',
      },
      {
        h2: '4. Subtract fees and shipping',
        html: '<p>What you keep is the sale price minus marketplace fees and the shipping you pay. On eBay.de private sellers pay no selling fees within Germany, business sellers do; on Vinted the buyer pays the fees. See <a href="/guides/ebay-fees-germany">eBay.de fees for private and business sellers</a> and <a href="/guides/where-to-sell-used-electronics-europe">where to sell used electronics in Europe</a>.</p>',
      },
      {
        h2: '5. Work out your maximum price',
        html: '<p>Decide the return you want, then divide what you keep by 1 plus that return. Example: a Nintendo Switch OLED expected to sell for €176, no selling fee, €6 shipping, so you keep €170. For a 40% return the most you should pay is €170 ÷ 1.4 = <strong>€121</strong>. Anything below is a buy; above it, negotiate or walk away.</p>',
      },
      {
        h2: 'Do it in seconds with FlipLens',
        html: '<p>FlipLens does all five steps from a photo, a barcode or a typed model: it identifies the exact variant, reads comparable eBay listings in five EU countries, adjusts for condition and asking prices, subtracts your marketplace fees and shipping, and shows the maximum price worth paying. You do not even need to know the seller\'s price.</p>',
      },
    ],
    faq: [
      { q: 'How do I know what something will resell for?', a: 'Identify the exact model, compare it with similar listings in the same condition, take the realistic middle of the range rather than the top asking price, then subtract selling fees and shipping.' },
      { q: 'How much should I pay for an item I want to resell?', a: 'Divide what you will keep after fees and shipping by 1 plus your target return. For €170 kept and a 40% target, pay at most €121.' },
    ],
  },
  {
    path: '/guides/ebay-fees-germany',
    kind: 'article',
    crumb: 'eBay.de fees',
    parent: { path: '/guides', name: 'Guides' },
    title: 'eBay.de fees in 2026: private vs business sellers',
    description: 'What selling on eBay Germany costs private and business sellers, with an example of how fees change your profit and the price you can pay for stock.',
    h1: 'eBay.de fees in 2026: private vs business sellers',
    lead: 'Whether you sell as a private person or as a business changes your margin on every item. Here is the difference and how to account for it. Always confirm current fees on eBay\'s own pages before relying on them.',
    sections: [
      {
        h2: 'Private sellers',
        html: '<p>Since 1 March 2023 private sellers on eBay.de pay <strong>no selling fees</strong> for sales within Germany. Optional extras, such as some listing upgrades and international selling, can still cost money. Source: <a href="https://www.ebay.de/help/selling/fees-credits-invoices/gebhren-fr-private-verkufer-die-der-zahlungsabwicklung-teilnehmen?id=4822">eBay.de help: fees for private sellers</a>.</p>',
      },
      {
        h2: 'Business sellers',
        html: '<p>Business sellers pay a final value fee that depends on the category and on whether the item is new or used. As of our last check (September 2026), the rates for the categories FlipLens covers were approximately:</p><table><thead><tr><th>Item</th><th>Fee</th></tr></thead><tbody><tr><td>Used or refurbished electronics</td><td>5%</td></tr><tr><td>New electronics</td><td>7%</td></tr><tr><td>Accessories</td><td>12%</td></tr><tr><td>Tools</td><td>13%</td></tr><tr><td>Per order over €10</td><td>+ €0.45</td></tr></tbody></table><p>These figures come from a secondary source and categories have exceptions, so check eBay\'s current fee table for your category.</p>',
      },
      {
        h2: 'Example: the same item, two seller types',
        html: '<p>A used Nintendo Switch OLED sells for €176 and you pay €6 shipping.</p><ul><li>Private seller: no selling fee, you keep €170. For a 40% return you can pay up to €121.</li><li>Business seller: about 5% (€8.80) plus €0.45, you keep about €160.75. For a 40% return you can pay up to about €114.</li></ul><p>A difference of a few euros per item adds up over a month of sourcing, so set your seller type correctly in FlipLens: every check then uses the right fees.</p>',
      },
      {
        h2: 'Private or business: which am I?',
        html: '<p>If you buy items with the intention of reselling them regularly, tax and consumer law usually treat that as a business activity, even when you started casually. This is general information, not legal or tax advice: check the rules in your country or ask an accountant.</p>',
      },
    ],
    faq: [
      { q: 'Do private sellers pay fees on eBay.de?', a: 'No selling fees for sales within Germany since 1 March 2023. Optional extras and international selling can cost money.' },
      { q: 'What do business sellers pay on eBay.de?', a: 'A final value fee by category and condition; as of September 2026 roughly 5% for used electronics and 7% for new, plus €0.45 per order over €10. Check eBay\'s current fee table.' },
    ],
  },
  {
    path: '/guides/where-to-sell-used-electronics-europe',
    kind: 'article',
    crumb: 'Where to sell used electronics',
    parent: { path: '/guides', name: 'Guides' },
    title: 'Where to sell used electronics in Europe: eBay, Vinted, Kleinanzeigen or local',
    description: 'Compare eBay, Vinted, Kleinanzeigen and local cash sales for second-hand electronics in Europe: who pays fees, reach, speed and when each one makes sense.',
    h1: 'Where to sell used electronics in Europe',
    lead: 'The best marketplace depends on the item, how fast you want to sell and who pays the fees. A quick comparison for resellers in the EU.',
    sections: [
      {
        h2: 'eBay: the widest reach',
        html: '<p>eBay has country sites across Europe (Germany, France, Italy, Spain, the Netherlands and more) and buyers who search by exact model. It suits items with a clear model number: consoles, phones, headphones, cameras and lenses. Private sellers in Germany pay no selling fees within Germany; business sellers pay a fee by category. See <a href="/guides/ebay-fees-germany">eBay.de fees</a>.</p>',
      },
      {
        h2: 'Vinted: no seller fees',
        html: '<p>On Vinted the seller pays no fee: the buyer pays a buyer protection fee and shipping on top. That makes your price look higher to the buyer, so items may need to be listed a little lower. It works well for small, easy-to-ship electronics and gaming.</p>',
      },
      {
        h2: 'Kleinanzeigen: local in Germany',
        html: '<p>Kleinanzeigen is the big classifieds site in Germany. Basic listings for private sellers are free, many buyers prefer pickup, and buyers expect to negotiate, so start a bit above your target price. Good for bulky or heavy items where shipping would eat the margin.</p>',
      },
      {
        h2: 'Local pickup and cash',
        html: '<p>No fees and no shipping, but a smaller audience and slower sales. Worth it for large items or when you already have a buyer.</p>',
      },
      {
        h2: 'Compare before you buy',
        html: '<p>Set the marketplace you usually sell on in FlipLens and every check uses its fees and shipping rules. The result also links to Vinted, Kleinanzeigen and other marketplaces so you can see local prices yourself.</p>',
      },
    ],
    faq: [
      { q: 'Is it better to sell electronics on eBay or Vinted?', a: 'eBay reaches more buyers who search by exact model and suits higher-value items; on Vinted the seller pays no fee because the buyer pays buyer protection, which works well for small items. Compare what you keep after fees and shipping.' },
      { q: 'Who pays the fees on Vinted?', a: 'The buyer. Vinted charges the buyer a buyer protection fee and shipping; the seller receives the listed price.' },
    ],
  },
  {
    path: '/guides/flea-market-reselling-checklist',
    kind: 'article',
    crumb: 'Flea market checklist',
    parent: { path: '/guides', name: 'Guides' },
    title: 'Flea market reselling checklist: what to check before you buy electronics',
    description: 'A practical checklist for buying second-hand electronics, consoles and cameras at flea markets and car boot sales to resell: identification, testing, completeness, locks and price.',
    h1: 'Flea market reselling checklist',
    lead: 'Most bad buys are not overpriced, they are the wrong variant, incomplete or locked. Run through this before you hand over cash.',
    sections: [
      {
        h2: 'Before you go',
        html: '<ul><li>Charge your phone and bring a power bank: you will be checking prices on the spot.</li><li>Bring small notes and coins, sellers rarely have change early in the morning.</li><li>Know your maximum price per item type, or check it with FlipLens in a few seconds.</li></ul>',
      },
      {
        h2: 'Identify the exact item',
        html: '<ul><li>Find the model number on the label, battery compartment or box. Take a photo of it.</li><li>Check storage size, generation and for lenses the mount.</li><li>Barcodes on boxes identify the exact variant fastest.</li></ul>',
      },
      {
        h2: 'Test what you can',
        html: '<ul><li>Does it power on? Ask for a socket or bring a power bank and cable.</li><li>Screens: dead pixels, burn-in, cracks. Ports: wobbly charging ports are common.</li><li>Controllers and Joy-Cons: check for stick drift.</li><li>Cameras and lenses: look through the lens against light for haze, fungus and scratches; check the shutter fires.</li><li>Phones and tablets: check battery health in settings if possible.</li></ul>',
      },
      {
        h2: 'Check it is not locked',
        html: '<p>Phones, tablets, laptops and smartwatches can be tied to the previous owner\'s account (for example Apple\'s Activation Lock). A locked device is worth a fraction of its price. Ask the seller to show it is signed out or reset in front of you.</p>',
      },
      {
        h2: 'Completeness adds value',
        html: '<p>The original box, charger, cables, lens caps and manuals all help an item sell faster and for more. Missing chargers and proprietary cables cost you money to replace.</p>',
      },
      {
        h2: 'Decide on the numbers',
        html: '<p>Compare the asking price with the maximum price worth paying after fees and shipping. If the seller is above it, negotiate down to it or walk away. See <a href="/guides/how-to-check-resale-value">how to check resale value</a>.</p>',
      },
    ],
    faq: [
      { q: 'What should I check before buying used electronics to resell?', a: 'The exact model and variant, that it powers on and works, screen and port condition, that it is not locked to someone else\'s account, what accessories are included, and that the price is below your maximum after fees and shipping.' },
    ],
  },
  {
    path: '/vinted-listing-generator',
    kind: 'page',
    crumb: 'Vinted listing generator',
    cta: LISTING_CTA,
    title: 'Vinted listing generator: title and description from a photo',
    description: `Take a photo of anything you sell, clothes included, and get a Vinted title, description and hashtags in your language. ${PLANS.free.monthlyListings} free listings a month.`,
    h1: 'Vinted listing generator',
    lead: 'Take a photo of the item and get a title, description and hashtags ready to paste into Vinted. Works for clothes, shoes, bags, home, toys and tech, in your language.',
    sections: [
      {
        h2: 'How it works',
        html: '<ol><li>Take one to three photos: front, back and the brand or size label work best.</li><li>Pick the condition and add what photos cannot show, such as size, material or a small flaw.</li><li>Copy the title and description, open Vinted and paste.</li></ol>',
      },
      {
        h2: 'What it writes',
        html: '<p>For Vinted: a short, natural title (brand, item and one key detail), a friendly and honest description, one sentence about the condition and a few relevant search words and hashtags. The same photo can also become an eBay listing (keyword-first title, structured description) or a Kleinanzeigen ad (direct, with the usual private-sale note).</p>',
      },
      {
        h2: 'Honest by design',
        html: '<p>The writer describes only what is visible in your photos or written in your details. It does not invent a size, material, brand or measurements. When something buyers usually ask about is missing, such as the size or measurements, it tells you so you can add it before you post.</p>',
      },
      {
        h2: 'What about the price?',
        html: '<p>FlipLens does not read Vinted data. After writing your listing it links to similar items on Vinted so you can compare prices in a tap. For electronics, games and cameras, FlipLens can also <a href="/how-it-works">estimate the resale value</a> from eBay listings in five EU countries.</p>',
      },
      {
        h2: 'Plans',
        html: `<p>Free: ${PLANS.free.monthlyListings} listings a month. Pro (${eur(PLANS.pro.priceMonthlyMinor)}/month): ${PLANS.pro.monthlyListings} listings and ${PLANS.pro.monthlyValuations} price checks. Reseller (${eur(PLANS.reseller.priceMonthlyMinor)}/month): up to ${PLANS.reseller.monthlyListings.toLocaleString('en')}. See <a href="/pricing">pricing</a>.</p>`,
      },
    ],
    faq: [
      { q: 'Is the Vinted listing generator free?', a: `Yes, ${PLANS.free.monthlyListings} listings a month are free after signing in with Google. Pro includes ${PLANS.pro.monthlyListings} a month.` },
      { q: 'Which languages does it write in?', a: 'English, German, French, Italian, Spanish, Dutch, Polish, Slovenian, Croatian, Czech, Portuguese and Swedish.' },
      { q: 'Does it post to Vinted for me?', a: 'No. You copy the text and paste it into Vinted yourself. FlipLens is independent and not affiliated with Vinted.' },
      { q: 'Are my photos stored?', a: 'No. Photos are only used to write the listing and are not stored.' },
    ],
  },
  {
    path: '/guides/how-to-sell-on-vinted',
    kind: 'article',
    crumb: 'How to sell on Vinted',
    parent: { path: '/guides', name: 'Guides' },
    cta: LISTING_CTA,
    title: 'How to sell on Vinted: fees, listings that sell and pricing',
    description: 'A practical guide to selling on Vinted in Europe: who pays the fees, how to photograph and describe items, how to price them and how to ship.',
    h1: 'How to sell on Vinted',
    lead: 'Vinted is the biggest second-hand marketplace for clothes in Europe and works for small electronics and home items too. Clear photos, an honest description and the right price do most of the work.',
    sections: [
      {
        h2: 'Who pays the fees',
        html: '<p>Sellers pay no selling fee on Vinted. The buyer pays a Buyer Protection fee and the shipping on top of your price, so the total they see is higher than what you asked. Optional paid promotions, such as bumping an item, are available to sellers. Fees can differ by country and change over time, so check Vinted\'s help centre for the current rules.</p>',
      },
      {
        h2: 'Photos that get clicks',
        html: '<ul><li>Use daylight and a plain background.</li><li>Show the front, the back, the brand label and the size label.</li><li>Photograph flaws close up: buyers trust sellers who show them.</li><li>Your first photo is what people see in search, so make it the clearest one.</li></ul>',
      },
      {
        h2: 'Title and description',
        html: '<p>Start the title with the brand and the item, then one key detail such as size or colour: "Levi\'s 501 jeans W32 L32, dark blue". In the description give the size and, for clothes, measurements (for example chest and length), the material from the care label, how it fits and the condition, including any flaws. Add a few words people search for, such as the style or the occasion.</p>',
      },
      {
        h2: 'Choose the condition honestly',
        html: '<p>Vinted asks you to choose a condition, from "New with tags" to "Satisfactory". Picking a better condition than the item has is a common cause of disputes and returns. If in doubt, choose the lower one and explain in the description.</p>',
      },
      {
        h2: 'Pricing',
        html: '<p>Search Vinted for the same brand and item in a similar condition and price within that range. Many buyers send offers, so leave a little room. Bundle discounts encourage buyers to take several items in one parcel, which also saves you trips to the post office.</p>',
      },
      {
        h2: 'Shipping',
        html: '<p>Pack items securely, ship within the time Vinted gives you and keep the proof of postage until the buyer has confirmed the order.</p>',
      },
      {
        h2: 'Write listings faster',
        html: '<p>The <a href="/vinted-listing-generator">FlipLens listing generator</a> turns a photo into a Vinted title and description in your language and tells you what buyers will ask about, such as size or measurements.</p>',
      },
    ],
    faq: [
      { q: 'Do sellers pay fees on Vinted?', a: 'No selling fee. The buyer pays a Buyer Protection fee and shipping on top of the price. Optional promotions cost extra.' },
      { q: 'How do I write a good Vinted description?', a: 'Give the brand, size and measurements, material, fit and an honest condition including flaws, plus a few words buyers search for.' },
    ],
  },
];

const GUIDES = PAGES.filter((p) => p.path.startsWith('/guides/'));
PAGES.push({
  path: '/guides',
  kind: 'page',
  crumb: 'Guides',
  title: 'Reselling guides for Europe: prices, fees and sourcing',
  description: 'Practical guides for resellers in Europe: how to check resale value, eBay.de fees, where to sell used electronics and a flea market checklist.',
  h1: 'Reselling guides',
  lead: 'Short, practical guides for sourcing and reselling second-hand items in Europe.',
  sections: [
    {
      h2: 'All guides',
      html: `<ul class="guide-list">${GUIDES.map((g) => `<li><a href="${g.path}">${esc(g.h1)}</a><br><span>${esc(g.description)}</span></li>`).join('')}</ul>`,
    },
  ],
});

// ---------- rendering ----------

const NAV = `<header class="top"><a class="brand" href="/"><img src="/icons/icon.svg" alt="" width="28" height="28"> FlipLens</a><nav><a href="/how-it-works">How it works</a><a href="/pricing">Pricing</a><a href="/guides">Guides</a><a href="/faq">FAQ</a><a class="btn small" href="/">Try free</a></nav></header>`;
const FOOTER = `<footer><p><a href="/how-it-works">How it works</a> · <a href="/pricing">Pricing</a> · <a href="/guides">Guides</a> · <a href="/faq">FAQ</a> · <a href="/privacy">Privacy</a> · <a href="/terms">Terms</a> · <a href="mailto:${LEGAL.supportEmail}">${LEGAL.supportEmail}</a></p><p>© ${new Date().getFullYear()} ${esc(LEGAL.operator)}. FlipLens is not affiliated with eBay. eBay data shown via the eBay API.</p></footer>`;

const ORG = { '@type': 'Organization', '@id': `${SITE}/#org`, name: 'FlipLens', url: SITE, logo: `${SITE}/icons/icon-512.png`, email: LEGAL.supportEmail };

function faqLd(faq: Faq[]) {
  return { '@type': 'FAQPage', mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) };
}

function head(o: { title: string; description: string; path: string; type: 'website' | 'article'; ld: unknown[] }): string {
  const url = `${SITE}${o.path === '/' ? '/' : o.path}`;
  return [
    `<title>${esc(o.title)}</title>`,
    `<meta name="description" content="${esc(o.description)}">`,
    `<link rel="canonical" href="${url}">`,
    `<meta property="og:type" content="${o.type}">`,
    `<meta property="og:site_name" content="FlipLens">`,
    `<meta property="og:title" content="${esc(o.title)}">`,
    `<meta property="og:description" content="${esc(o.description)}">`,
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:image" content="${SITE}/og.png">`,
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="630">`,
    `<meta property="og:locale" content="en_GB">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${esc(o.title)}">`,
    `<meta name="twitter:description" content="${esc(o.description)}">`,
    `<meta name="twitter:image" content="${SITE}/og.png">`,
    `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': o.ld }).replace(/</g, '\\u003c')}</script>`,
  ].join('\n    ');
}

function renderPage(p: Page): string {
  const crumbs = [{ path: '/', name: 'FlipLens' }, ...(p.parent ? [p.parent] : []), { path: p.path, name: p.crumb }];
  const ld: unknown[] = [
    ORG,
    { '@type': 'BreadcrumbList', itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: `${SITE}${c.path}` })) },
    p.kind === 'article'
      ? { '@type': 'Article', headline: p.h1, description: p.description, datePublished: UPDATED, dateModified: UPDATED, author: { '@id': `${SITE}/#org` }, publisher: { '@id': `${SITE}/#org` }, image: `${SITE}/og.png`, mainEntityOfPage: `${SITE}${p.path}` }
      : { '@type': 'WebPage', name: p.title, description: p.description, url: `${SITE}${p.path}`, isPartOf: { '@id': `${SITE}/#website` } },
    ...(p.faq ? [faqLd(p.faq)] : []),
  ];
  const faqHtml = p.faq
    ? `<section><h2>${p.sections.length ? 'Questions' : 'Answers'}</h2>${p.faq.map((f) => `<details open><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('')}</section>`
    : '';
  return `<!doctype html>
<!-- Generated by apps/web/scripts/site.ts. Edit the script, not this file. -->
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="theme-color" content="#0f766e">
    <link rel="icon" href="/icons/icon.svg" type="image/svg+xml">
    <link rel="apple-touch-icon" href="/icons/icon-192.png">
    <link rel="stylesheet" href="/site.css">
    ${head({ title: p.title, description: p.description, path: p.path, type: p.kind === 'article' ? 'article' : 'website', ld })}
  </head>
  <body>
    ${NAV}
    <main>
      <nav class="crumbs" aria-label="Breadcrumb">${crumbs.map((c, i) => (i === crumbs.length - 1 ? `<span>${esc(c.name)}</span>` : `<a href="${c.path}">${esc(c.name)}</a>`)).join(' / ')}</nav>
      <article>
        <h1>${esc(p.h1)}</h1>
        <p class="lead">${esc(p.lead)}</p>
        ${p.kind === 'article' ? `<p class="meta">Updated ${UPDATED} · by FlipLens</p>` : ''}
        ${p.sections.map((s) => `<section><h2>${esc(s.h2)}</h2>${s.html}</section>`).join('\n        ')}
        ${faqHtml}
        ${p.cta ?? CTA}
      </article>
    </main>
    ${FOOTER}
  </body>
</html>
`;
}

// ---------- index.html (the app shell): meta, JSON-LD, prerendered landing ----------

const HOME_TITLE = 'FlipLens: is it worth buying to resell? Resale value checker for Europe';
const HOME_DESC = 'Photo, barcode or model name: FlipLens shows what second-hand electronics, consoles and cameras resell for on eBay in 5 EU countries, your profit after fees and the most you should pay. 10 free checks a month.';

function homeHead(): string {
  return head({
    title: HOME_TITLE,
    description: HOME_DESC,
    path: '/',
    type: 'website',
    ld: [
      ORG,
      { '@type': 'WebSite', '@id': `${SITE}/#website`, name: 'FlipLens', url: SITE, publisher: { '@id': `${SITE}/#org` }, inLanguage: 'en' },
      {
        '@type': 'WebApplication',
        name: 'FlipLens',
        url: SITE,
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web, iOS, Android',
        description: HOME_DESC,
        publisher: { '@id': `${SITE}/#org` },
        offers: plans.map((p) => ({ '@type': 'Offer', name: p.name, price: (p.priceMonthlyMinor / 100).toFixed(2), priceCurrency: 'EUR', description: p.features.join('; '), url: `${SITE}/pricing` })),
      },
      faqLd(COMMON_FAQ),
    ],
  });
}

/** Text of the start page for crawlers without JavaScript. React replaces it on load; keep in step with screens/Landing.tsx. */
function homePrerender(): string {
  return `<div class="prerender">
      <header><strong>FlipLens</strong> · <a href="/how-it-works">How it works</a> · <a href="/pricing">Pricing</a> · <a href="/guides">Guides</a> · <a href="/faq">FAQ</a></header>
      <h1>Know what it's worth before you buy it.</h1>
      <p>For resellers in Europe. Take a photo, scan the barcode or type the model: FlipLens shows what the item resells for on eBay in Germany, France, Italy, Spain and the Netherlands, your profit after fees and shipping, the most you should pay, and a clear verdict: strong buy, buy, borderline or skip.</p>
      <h2>Three taps, a few seconds</h2>
      <ol><li>Scan it: photo of the item or its label, the barcode on the box, or just type the model.</li><li>Enter the price (optional): without it you get the maximum price worth paying.</li><li>Get the verdict, with the numbers and the reasons behind it.</li></ol>
      <h2>Built for buying decisions, not guesses</h2>
      <ul><li>Exact model, not "headphones": wrong variants, accessories, bundles and broken items are filtered out.</li><li>Live market data from eBay in five EU countries, converted to euro. You can see every listing used.</li><li>Profit after marketplace fees and shipping, plus the maximum price worth paying.</li><li>Honest about uncertainty: every verdict shows its confidence; not enough data means no number.</li><li>Selling? Turn a photo of any item, clothes included, into a Vinted, eBay or Kleinanzeigen listing: <a href="/vinted-listing-generator">listing generator</a>.</li></ul>
      <h2>Pricing</h2>
      <ul>${plans.map((p) => `<li>${esc(p.name)}: ${p.priceMonthlyMinor ? `${eur(p.priceMonthlyMinor)} per month` : 'free'}. ${p.features.map(esc).join(', ')}.</li>`).join('')}</ul>
      <h2>Questions</h2>
      ${COMMON_FAQ.map((f) => `<h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>`).join('')}
      <h2>Guides</h2>
      <ul>${GUIDES.map((g) => `<li><a href="${g.path}">${esc(g.h1)}</a></li>`).join('')}</ul>
      <p><a href="/privacy">Privacy Policy</a> · <a href="/terms">Terms of Service</a> · Not affiliated with eBay.</p>
    </div>`;
}

function replaceBetween(src: string, name: string, content: string): string {
  const re = new RegExp(`(<!-- ${name}:start -->)[\\s\\S]*?(<!-- ${name}:end -->)`);
  if (!re.test(src)) throw new Error(`index.html is missing the ${name} markers`);
  return src.replace(re, `$1\n    ${content}\n    $2`);
}

// ---------- sitemap, robots, llms ----------

const URLS = ['/', ...PAGES.map((p) => p.path).sort(), '/privacy', '/terms'];

function sitemap(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${URLS.map((u) => `  <url><loc>${SITE}${u}</loc><lastmod>${UPDATED}</lastmod></url>`).join('\n')}
</urlset>
`;
}

function robots(): string {
  const aiBots = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Applebot-Extended', 'Bingbot', 'CCBot', 'Meta-ExternalAgent'];
  return `# FlipLens welcomes search engines and AI assistants.
User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin

${aiBots.map((b) => `User-agent: ${b}\nAllow: /\nDisallow: /api/`).join('\n\n')}

Sitemap: ${SITE}/sitemap.xml
`;
}

function llms(): string {
  return `# FlipLens

> FlipLens (${SITE}) is a web app for resellers in Europe that answers "I can buy this for €X: is it worth buying to resell?". From a photo, a barcode or a typed model it identifies the exact product, reads comparable active eBay listings in Germany, France, Italy, Spain and the Netherlands, estimates the resale value, subtracts marketplace fees and shipping, and returns profit, ROI, the maximum price worth paying and a verdict (strong buy, buy, borderline, skip). It is independent, not affiliated with eBay, and does not buy, sell or ship items.

Key facts:
- Works best for consumer electronics, gaming and cameras (headphones, phones, tablets, laptops, consoles, controllers, games, camera bodies, lenses) and power tools. Fashion is not supported yet.
- The purchase price is optional: without it FlipLens shows the maximum price worth paying for the user's target ROI.
- Fee profiles: eBay.de private and business sellers, Vinted, local pickup. Each shows when it was last checked.
- When fewer than 5 comparable listings remain it says "not enough market data" instead of guessing.
- Pricing (EUR, final prices): ${planLine}.
- Also: a listing writer that turns a photo of any item (clothes included) into a Vinted, eBay or Kleinanzeigen title and description (${PLANS.free.monthlyListings} free per month), and stock tracking with real profit.
- Installs on phones as a web app (PWA). Sign-in with Google. Photos are never stored.
- Operator: ${LEGAL.operator}, Slovenia. Contact: ${LEGAL.supportEmail}.

## Product
- [How it works](${SITE}/how-it-works): identification, comparables, estimate, fees, verdict and known limits
- [Pricing](${SITE}/pricing): Free, Pro and Reseller plans
- [FAQ](${SITE}/faq)

## Guides
${GUIDES.map((g) => `- [${g.h1}](${SITE}${g.path}): ${g.description}`).join('\n')}

## Legal
- [Privacy Policy](${SITE}/privacy)
- [Terms of Service](${SITE}/terms)

## Optional
- [Full text of all pages](${SITE}/llms-full.txt)
`;
}

function llmsFull(): string {
  return [
    `# FlipLens: full text\n\nSource: ${SITE}. Updated ${UPDATED}.\n`,
    ...PAGES.map((p) =>
      [
        `\n## ${p.h1}\n\nURL: ${SITE}${p.path}\n\n${p.lead}\n`,
        ...p.sections.map((s) => `\n### ${s.h2}\n\n${strip(s.html)}\n`),
        ...(p.faq ?? []).map((f) => `\n**${f.q}**\n${f.a}\n`),
      ].join(''),
    ),
  ].join('\n');
}

// ---------- write ----------

function write(path: string, content: string): void {
  const full = resolve(PUBLIC, path);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content);
}

for (const p of PAGES) write(`${p.path.slice(1)}.html`, renderPage(p));
write('sitemap.xml', sitemap());
write('robots.txt', robots());
write('llms.txt', llms());
write('llms-full.txt', llmsFull());

let index = readFileSync(INDEX, 'utf8');
index = replaceBetween(index, 'seo', homeHead());
index = replaceBetween(index, 'prerender', homePrerender());
writeFileSync(INDEX, index);

console.log(`site: ${PAGES.length} pages, ${URLS.length} sitemap URLs, llms.txt, robots.txt, index.html updated`);
