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
import { PLANS, REFERRAL } from '@fliplens/core';
import { LEGAL } from '../src/legal.js';
import { PLAN_FEATURES_BY_LANG } from '../src/i18n.js';
import { EXAMPLE_PEOPLE, INVITE_BONUS_CHECKS, LANG_NAMES, LANGS, SITE, UPDATED, esc, exampleMinor, href, type Faq, type Lang, type LangPack, type Page, type UiStrings } from './site-common.js';
import { IT } from './site-it.js';
import { FR } from './site-fr.js';

const here = dirname(fileURLToPath(import.meta.url));
const PUBLIC = resolve(here, '../public');
const INDEX = resolve(here, '../index.html');

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


const plans = Object.values(PLANS);
const paid = plans.filter((p) => p.priceMonthlyMinor > 0);
const planLine = plans.map((p) => `${p.name} at ${p.priceMonthlyMinor ? `${eur(p.priceMonthlyMinor)}/month` : '€0'}: ${p.features[0]!.toLowerCase().replace(/\s*\((.*)\)/, ', $1')}`).join('; ');

const CTA = `<p class="cta"><a class="btn" href="/">Check an item for free</a><span>Try two checks without an account, then 10 free checks a month with Google sign-in. No card needed.</span></p>`;

const LISTING_CTA = `<p class="cta"><a class="btn" href="/?tool=listing">Write my listing free</a><span>${PLANS.free.monthlyListings} free listings a month. Try one without an account. No card needed.</span></p>`;

const COMMON_FAQ: Faq[] = [
  {
    q: 'What is FlipLens?',
    a: 'FlipLens is a web app for resellers in Europe. Take a photo, scan a barcode or type a model, and it tells you what the item resells for on eBay in Germany, France, Italy, Spain and the Netherlands or on eBay.co.uk in the UK, your profit after fees and shipping, the most you should pay, and a verdict: strong buy, buy, borderline or skip.',
  },
  {
    q: 'Where do the prices come from?',
    a: 'From active eBay listings, read through the official eBay API: eBay in five EU countries in euro (converted with ECB exchange rates), or eBay.co.uk in pounds if you sell in the UK. Asking prices are usually above what items finally sell for, so FlipLens adjusts them down and always shows how many listings an estimate is based on. You can open every listing it used.',
  },
  {
    q: 'Which items work best?',
    a: 'Consumer electronics, gaming and cameras: headphones, smartphones, tablets, laptops, smartwatches, speakers, consoles, handhelds, controllers, games, camera bodies, lenses, action and compact cameras, plus power tools. Branded clothes, shoes and bags are priced too, by brand, type and condition (a rougher estimate than for electronics). LEGO sets by set number; books, vinyl, CDs and DVDs by barcode. Watches by model; branded jewellery by brand and type (unbranded gold and silver, furniture and vehicles are not priced).',
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
    description: 'How FlipLens identifies the exact product, finds comparable eBay listings in five EU countries or the UK, estimates resale value, subtracts fees and shipping, and decides strong buy, buy, borderline or skip.',
    h1: 'How FlipLens works',
    lead: 'FlipLens answers one question: "I can buy this for €X. Is it worth buying to resell?" Here is exactly how the answer is made, including where it can be wrong.',
    sections: [
      {
        h2: '1. Identify the exact product',
        html: '<p>You take a photo of the item or its label, scan the barcode on the box, or type the model. Photos are identified by an AI vision model; barcodes (EAN and UPC) are matched against marketplace listings. FlipLens looks for the details that change the price: model generation (WH-1000XM4 is not XM5), storage (128 GB is not 256 GB), lens mount (RF is not EF) and condition. You can correct anything before the check runs.</p>',
      },
      {
        h2: '2. Find comparable listings',
        html: '<p>FlipLens searches current eBay listings through the official eBay API: in Germany, France, Italy, Spain and the Netherlands, with prices converted to euro at European Central Bank rates, or on eBay.co.uk in pounds if you sell in the UK (the default there, selectable from any country). One tap on the result shows a UK vs EU comparison: the same item on eBay.co.uk and on the five EU sites side by side, in pounds and euros, without using a check. It then filters out what would distort the price: other models and variants, accessories sold on their own, bundles, broken or "for parts" items, duplicates and listings in a very different condition. You can see every listing that was used and why others were removed.</p>',
      },
      {
        h2: '3. Estimate the resale value',
        html: '<p>From the remaining listings FlipLens builds a price distribution adjusted to your item\'s condition and reports three numbers: a quick-sale price, the expected sale price and a high asking price. Because asking prices are usually above final sale prices, the estimate is adjusted down. Every estimate carries a confidence score based on how many listings matched, how much they agree and how well the product was identified.</p>',
      },
      {
        h2: '4. Calculate profit after fees',
        html: '<p>FlipLens subtracts the selling fees of the marketplace you sell on (for example eBay.de private or business, eBay.co.uk private, Vinted or local pickup), your shipping cost and the purchase price. The result is profit, return on investment (ROI) and the <strong>maximum price worth paying</strong> for your target ROI: max price = money you keep after fees and shipping ÷ (1 + target ROI).</p>',
      },
      {
        h2: '5. Give a verdict, or say it does not know',
        html: '<p>The verdict is strong buy, buy, borderline or skip, with the reasons and risks behind it. If fewer than five matching listings remain, or the product identification is too uncertain, FlipLens says "not enough market data" instead of inventing a number.</p>',
      },
      {
        h2: 'Known limits',
        html: '<ul><li>Prices are based on active listings (asking prices), not on confirmed sale prices.</li><li>Supply is visible (how many items are for sale and for how long), sell-through speed is not yet.</li><li>Collectibles and one-of-a-kind items are not supported. Clothes, shoes and bags are priced by brand, type and condition, not by the exact piece.</li><li>Fees change: each fee profile shows when it was last checked and links to its source.</li></ul>',
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
      { q: 'Can FlipLens check a whole table at once?', a: 'Yes. Take one photo of a stall, a box or a shelf and FlipLens finds up to 6 items, checks each against real eBay listings (one check per item) and lists the best buys first. Or keep the camera open with the live radar: items get a box with their name as you move, and a tap checks the price. Prices only ever come from a real check, never from a guess. Both need a Google sign-in.' },
      { q: 'Which countries does FlipLens cover?', a: 'The UK and five EU countries. If you sell on eBay.co.uk (the default when your country is the United Kingdom), FlipLens uses eBay.co.uk listings and shows prices in pounds, with UK private seller fees. Otherwise market data comes from eBay Germany, France, Italy, Spain and the Netherlands, in euro. You can pick eBay.de or eBay.co.uk in your profile whatever your country, and the UK vs EU comparison on the result shows the same item on eBay.co.uk and on the five EU sites side by side, in pounds and euros, without using a check. Links to check prices yourself are available for Vinted, Kleinanzeigen and other marketplaces.' },
      { q: 'How accurate is the estimate?', a: 'It depends on the market. Every result shows a confidence score, how many listings it is based on and the risks. When there is not enough data, FlipLens says so instead of guessing. You can track your real sale prices in Stock and see how close the estimates were.' },
      { q: 'Which marketplaces are the fees calculated for?', a: 'eBay.de for private and business sellers, eBay.co.uk for private sellers, Vinted and local pickup with cash. Each fee profile shows when it was last checked.' },
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
        html: '<p>FlipLens does all five steps from a photo, a barcode or a typed model: it identifies the exact variant, reads comparable eBay listings in five EU countries or on eBay.co.uk, adjusts for condition and asking prices, subtracts your marketplace fees and shipping, and shows the maximum price worth paying. You do not even need to know the seller\'s price.</p>',
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
        html: '<p>FlipLens does not read Vinted data. After writing your listing it links to similar items on Vinted so you can compare prices in a tap. For electronics, games and cameras, FlipLens can also <a href="/how-it-works">estimate the resale value</a> from eBay listings in five EU countries or on eBay.co.uk.</p>',
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
  {
    path: '/best-resale-value-apps',
    kind: 'article',
    crumb: 'Ways to check resale value',
    title: 'How to check resale value in Europe: apps and methods compared (2026)',
    description: 'An honest comparison of the ways to find what a second-hand item is worth in Europe: FlipLens, eBay sold listings, Vinted and Kleinanzeigen searches, Google Lens and trade-in offers.',
    h1: 'How to check resale value in Europe: apps and methods compared',
    lead: 'There is no single perfect source for second-hand prices. Each method below answers a slightly different question. Here is what each one is good at, where it falls short, and when to use it.',
    sections: [
      {
        h2: 'At a glance',
        html: '<table><thead><tr><th>Method</th><th>Speed</th><th>Data</th><th>Sold or asking prices</th><th>Countries</th><th>Cost</th></tr></thead><tbody><tr><td>FlipLens</td><td>Seconds, from a photo, barcode or model name</td><td>Active eBay listings, filtered and adjusted for condition</td><td>Asking prices, adjusted down</td><td>Germany, France, Italy, Spain, Netherlands at once, or the UK</td><td>10 free checks a month, paid plans for more</td></tr><tr><td>eBay "Sold items" filter</td><td>A few minutes per item</td><td>Completed sales on one eBay site</td><td>Sold prices</td><td>One country at a time</td><td>Free</td></tr><tr><td>Vinted, Kleinanzeigen searches</td><td>A few minutes</td><td>Current local listings</td><td>Asking prices</td><td>One marketplace and region</td><td>Free</td></tr><tr><td>Google Lens, then a marketplace search</td><td>Fast to identify, slow to price</td><td>Visual match, then your own search</td><td>Whatever you find</td><td>Any</td><td>Free</td></tr><tr><td>Trade-in and buyback sites</td><td>Instant offer</td><td>The buyer\'s own price list</td><td>An offer to buy from you</td><td>Varies</td><td>Free</td></tr></tbody></table>',
      },
      {
        h2: 'FlipLens',
        html: '<p>FlipLens identifies the exact model from a photo, barcode or typed name, reads comparable active eBay listings in five EU countries or on eBay.co.uk, removes other variants, bundles and broken items, adjusts for condition and returns a resale range, your profit after fees and shipping and the most you should pay. <strong>Good for:</strong> fast buying decisions at flea markets and on classifieds, when you do not want to research every item by hand. <strong>Limits:</strong> it works from asking prices, not confirmed sale prices; it covers consumer electronics, gaming, cameras and power tools, not fashion; if there are too few comparable listings it says so instead of estimating. See <a href="/how-it-works">how it works</a>.</p>',
      },
      {
        h2: 'eBay search with the "Sold items" filter',
        html: '<p>On eBay you can filter a search to show items that actually sold. <strong>Better than FlipLens at:</strong> showing real final prices rather than asking prices. <strong>Drawbacks:</strong> you check one eBay site at a time, you have to read through the results yourself to remove other generations, bundles and broken items, and you still need to subtract fees and shipping to know your profit. Worth doing for expensive items before you commit.</p>',
      },
      {
        h2: 'Searching Vinted or Kleinanzeigen',
        html: '<p>Searching the marketplace you plan to sell on shows the competition you will face. <strong>Good for:</strong> local pricing and items that sell mainly through classifieds. <strong>Drawbacks:</strong> you only see asking prices, and listings that sit unsold for weeks pull the picture up. FlipLens links to these searches from every result so you can compare in a tap.</p>',
      },
      {
        h2: 'Google Lens to identify an unknown item',
        html: '<p>When you do not know what an item is, an image search can find the name or model. <strong>Good for:</strong> unusual items, vintage pieces and anything without a readable label. <strong>Drawbacks:</strong> it identifies, it does not price; you still need to search marketplaces and judge condition and variants yourself.</p>',
      },
      {
        h2: 'Trade-in and buyback offers',
        html: '<p>Some shops and websites make an instant offer to buy your used phone, console or camera. <strong>Good for:</strong> selling quickly with no effort. <strong>Drawbacks:</strong> the offer is what the buyer is willing to pay to resell it themselves, so it is usually well below what you could get selling privately. It is a floor, not a resale value.</p>',
      },
      {
        h2: 'When to use which',
        html: '<ul><li><strong>Standing at a stall, seconds to decide:</strong> FlipLens.</li><li><strong>An expensive item before you buy:</strong> FlipLens first, then the eBay sold filter to confirm.</li><li><strong>Pricing your own listing:</strong> look at what is for sale on your marketplace right now.</li><li><strong>No idea what the item is:</strong> Google Lens first.</li><li><strong>You just want it gone:</strong> a trade-in offer, knowing it is the lowest number.</li></ul>',
      },
    ],
    faq: [
      { q: 'What is the most accurate way to find resale value?', a: 'Recent sold prices for the exact model in the same condition, adjusted for fees and shipping. eBay\'s sold filter shows them for one country at a time; FlipLens gives a fast estimate from active listings across five EU countries or on eBay.co.uk.' },
      { q: 'Why are trade-in offers so low?', a: 'The buyer has to resell the item and make a profit, so the offer is below the private resale price.' },
      { q: 'Is there a free way to check resale value?', a: 'Yes. Marketplace searches and the eBay sold filter are free, and FlipLens includes 10 free checks a month.' },
    ],
  },
  {
    path: '/guides/how-much-is-my-console-worth',
    kind: 'article',
    crumb: 'How much is my console worth',
    parent: { path: '/guides', name: 'Guides' },
    title: 'How much is my console worth? Consoles, handhelds, controllers and games',
    description: 'What decides the resale value of a used console, handheld, controller or game in Europe, the mistakes that cost money, and how to check the price in seconds.',
    h1: 'How much is my console worth?',
    lead: 'Gaming gear resells well, but two consoles that look the same can be worth very different amounts. These are the details that decide the price.',
    sections: [
      {
        h2: 'What drives the price',
        html: '<ul><li><strong>Exact model and revision:</strong> for example a standard model versus an OLED or Slim version, or a disc versus a digital edition. The model number on the bottom or back tells you.</li><li><strong>Storage:</strong> larger internal storage usually sells for more.</li><li><strong>Condition:</strong> scratches on screens, yellowed plastic, loud fans and controller stick drift all lower the price.</li><li><strong>Completeness:</strong> original box, controllers, dock, cables and power supply. A console without its power supply is harder to sell.</li><li><strong>Account and bans:</strong> a console still linked to someone else\'s account, or one banned from online services, is worth much less.</li></ul>',
      },
      {
        h2: 'Controllers and games',
        html: '<p>Controllers are checked for stick drift and worn buttons; official controllers sell better than third-party ones. For games, the edition matters (standard, collector\'s, region), and whether the case, manual and any codes are complete. Sealed games and complete-in-box retro games are their own market: compare like with like.</p>',
      },
      {
        h2: 'Common mistakes',
        html: '<ul><li>Comparing your item with a bundle that includes extra games or controllers.</li><li>Taking the highest asking price as the value.</li><li>Forgetting shipping: consoles are heavy and bulky.</li><li>Buying a handheld without testing the screen and buttons.</li></ul>',
      },
      {
        h2: 'Quick checklist',
        html: '<ul><li>Model number and storage noted.</li><li>Powers on, reads discs (if it has a drive), controllers connect.</li><li>Signed out of all accounts or factory reset.</li><li>Power supply and cables included.</li><li>Price compared with the same model in the same condition.</li></ul>',
      },
      {
        h2: 'Where to sell and how to check quickly',
        html: '<p>Consoles sell well on eBay and locally; see <a href="/guides/where-to-sell-used-electronics-europe">where to sell used electronics in Europe</a>. To check a console in seconds, scan its barcode or type the model in FlipLens: it compares listings on eBay in five EU countries or on eBay.co.uk and shows the most you should pay. <a href="/how-it-works">How it works</a>.</p>',
      },
    ],
    faq: [
      { q: 'How do I find out which console model I have?', a: 'Look for the model number on the bottom or back of the console or in the system settings. It tells you the exact version and often the storage size.' },
      { q: 'Does the original box matter?', a: 'Yes. A complete console with box, controllers and cables usually sells faster and for more than the console alone.' },
    ],
  },
  {
    path: '/guides/resale-value-cameras-lenses',
    kind: 'article',
    crumb: 'Cameras and lenses',
    parent: { path: '/guides', name: 'Guides' },
    title: 'Resale value of used cameras and lenses: what to check before you buy',
    description: 'What decides the resale value of a used camera body or lens in Europe: mount, shutter count, sensor and glass condition, completeness and region, plus a quick checklist.',
    h1: 'Resale value of used cameras and lenses',
    lead: 'Camera gear keeps its value better than most electronics, but a single problem such as fungus in a lens can make an item nearly worthless. Check these points before you pay.',
    sections: [
      {
        h2: 'What drives the price of a camera body',
        html: '<ul><li><strong>Exact model:</strong> generations of the same line differ a lot in value.</li><li><strong>Shutter count:</strong> how many photos the camera has taken. A high count lowers the value; many cameras let you read it from the files or the menu.</li><li><strong>Sensor and screen:</strong> scratches, dead pixels and dust that will not clean.</li><li><strong>Completeness:</strong> battery, charger, strap, caps and box.</li><li><strong>Region and language:</strong> some imported models have different menus or warranty terms.</li></ul>',
      },
      {
        h2: 'What drives the price of a lens',
        html: '<ul><li><strong>Mount:</strong> the same focal length exists for different mounts (for example Canon RF and EF, Sony E/FE, Nikon Z and F). Compare only the same mount.</li><li><strong>Optical condition:</strong> fungus, haze, separation and deep scratches seriously reduce the value. Shine a light through the lens from the back.</li><li><strong>Mechanics:</strong> autofocus works, zoom and focus rings are smooth, aperture blades are clean and dry.</li><li><strong>Version:</strong> many lenses exist in several versions (for example with or without stabilisation).</li></ul>',
      },
      {
        h2: 'Common mistakes',
        html: '<ul><li>Comparing a lens with the same focal length but a different mount or version.</li><li>Not testing autofocus on a body.</li><li>Missing fungus because the lens was not checked against light.</li><li>Ignoring the shutter count on a body that looks clean.</li></ul>',
      },
      {
        h2: 'Quick checklist',
        html: '<ul><li>Model, mount and version written down.</li><li>Lens checked against light for fungus and haze.</li><li>Body powers on, takes a photo, shutter count known if possible.</li><li>Battery and charger included.</li></ul>',
      },
      {
        h2: 'Where to sell and how to check quickly',
        html: '<p>Cameras and lenses sell well on eBay across Europe; see <a href="/guides/where-to-sell-used-electronics-europe">where to sell used electronics in Europe</a>. FlipLens reads the model and mount from a photo of the label or lens barrel and compares listings on eBay in five EU countries or on eBay.co.uk. <a href="/how-it-works">How it works</a>.</p>',
      },
    ],
    faq: [
      { q: 'How do I check a used lens for fungus?', a: 'Shine a bright light through the lens from the back and look for thread-like patterns, spots or a milky haze inside the glass.' },
      { q: 'Does shutter count matter when reselling?', a: 'Yes. Buyers compare it with the expected life of the shutter for that model, so a low count helps the price.' },
    ],
  },
  {
    path: '/guides/resale-value-headphones',
    kind: 'article',
    crumb: 'Headphones',
    parent: { path: '/guides', name: 'Guides' },
    title: 'Resale value of used headphones and earbuds: generations, battery and hygiene',
    description: 'What decides the resale value of used headphones and earbuds in Europe: exact generation, battery wear, ear pads, completeness and hygiene, plus a quick checklist.',
    h1: 'Resale value of used headphones and earbuds',
    lead: 'Popular headphones resell quickly, but generations look alike and batteries wear out. These are the details buyers check.',
    sections: [
      {
        h2: 'What drives the price',
        html: '<ul><li><strong>Exact generation:</strong> models from the same line, such as Sony WH-1000XM4 and WH-1000XM5, or different AirPods generations, sell for different prices. Check the model number on the headband, case or in the settings.</li><li><strong>Battery:</strong> wireless headphones and earbuds lose capacity over time; noticeably short battery life lowers the value.</li><li><strong>Ear pads and tips:</strong> worn or flaking pads put buyers off, but can often be replaced.</li><li><strong>Completeness:</strong> case, cable, adapter and box.</li><li><strong>Authenticity:</strong> popular earbuds are often counterfeited; serial numbers and pairing behaviour help to tell.</li></ul>',
      },
      {
        h2: 'Hygiene and earbuds',
        html: '<p>Many buyers are cautious about used in-ear products. Clean them carefully, replace silicone tips if possible and say so in the listing. A single missing earbud or a missing charging case makes a set much harder to sell.</p>',
      },
      {
        h2: 'Common mistakes',
        html: '<ul><li>Confusing two generations that look almost the same.</li><li>Not testing noise cancelling, microphones and both sides.</li><li>Buying earbuds that are still linked to someone else\'s account.</li></ul>',
      },
      {
        h2: 'Quick checklist',
        html: '<ul><li>Model number and generation confirmed.</li><li>Both sides work, noise cancelling and microphone tested.</li><li>Battery holds a charge.</li><li>Case, cable and tips included.</li><li>Removed from the previous owner\'s account.</li></ul>',
      },
      {
        h2: 'Where to sell and how to check quickly',
        html: '<p>Headphones sell well on eBay and Vinted; see <a href="/guides/where-to-sell-used-electronics-europe">where to sell used electronics in Europe</a>. In FlipLens a photo of the label or the box barcode is enough to identify the generation and compare prices on eBay in five EU countries or on eBay.co.uk. <a href="/how-it-works">How it works</a>.</p>',
      },
    ],
    faq: [
      { q: 'How do I tell headphone generations apart?', a: 'Read the model number printed on the headband, case or box, or in the companion app or Bluetooth settings.' },
      { q: 'Can I sell used earbuds?', a: 'Yes, but clean them, replace the tips if you can and describe their condition honestly. Complete sets with the charging case sell best.' },
    ],
  },
  {
    path: '/guides/sell-used-phone-europe',
    kind: 'article',
    crumb: 'Selling a used phone',
    parent: { path: '/guides', name: 'Guides' },
    title: 'Selling a used phone in Europe: what decides the price and what to check',
    description: 'What decides the resale value of a used smartphone in Europe: model, storage, battery health, account and carrier locks, condition, plus a checklist before you buy or sell.',
    h1: 'Selling a used phone in Europe',
    lead: 'Phones are the most common second-hand electronics, and the easiest to get wrong. A locked phone or the wrong storage size can turn a good deal into a loss.',
    sections: [
      {
        h2: 'What drives the price',
        html: '<ul><li><strong>Exact model:</strong> standard, Plus, Pro and Max versions differ a lot in value.</li><li><strong>Storage:</strong> more storage sells for more. Check it in the settings, not just on the box.</li><li><strong>Battery health:</strong> many phones show the battery condition in the settings; a weak battery lowers the price.</li><li><strong>Condition:</strong> screen scratches or cracks, back glass, frame dents, camera lenses, buttons and ports.</li><li><strong>Completeness:</strong> box and cable help a little; the phone itself matters most.</li></ul>',
      },
      {
        h2: 'Account locks and carrier locks',
        html: '<p>A phone that is still linked to the previous owner\'s account (for example Apple\'s Activation Lock or a Google account after a reset) cannot be set up by a new owner and is worth only a fraction of the price. Make sure the seller removes the account and resets the phone in front of you. Also check whether the phone is locked to a mobile network: unlocked phones sell to more buyers.</p>',
      },
      {
        h2: 'Common mistakes',
        html: '<ul><li>Buying a phone that is still signed in to an account.</li><li>Comparing prices of a different storage size or version.</li><li>Not checking for a replaced or non-original screen.</li><li>Ignoring battery health.</li></ul>',
      },
      {
        h2: 'Quick checklist',
        html: '<ul><li>Model and storage confirmed in the settings.</li><li>Signed out of all accounts and factory reset.</li><li>Not locked to a network.</li><li>Battery health checked.</li><li>Screen, cameras, speakers, microphone and charging port tested.</li></ul>',
      },
      {
        h2: 'Where to sell and how to check quickly',
        html: '<p>Phones sell on eBay, classifieds and Vinted; see <a href="/guides/where-to-sell-used-electronics-europe">where to sell used electronics in Europe</a>. FlipLens identifies the model from a photo or barcode, lets you set the storage, and compares listings on eBay in five EU countries or on eBay.co.uk. <a href="/how-it-works">How it works</a>.</p>',
      },
    ],
    faq: [
      { q: 'What should I check before buying a used phone?', a: 'That it is signed out of all accounts and reset, not locked to a network, has the storage you expect, a healthy battery, and a working screen, cameras and charging port.' },
      { q: 'Does storage size change the resale value?', a: 'Yes. The same model with more storage usually sells for more, so always compare the same storage size.' },
    ],
  },
  {
    path: '/guides/resale-value-branded-clothes',
    kind: 'article',
    crumb: 'Resale value of clothes',
    parent: { path: '/guides', name: 'Guides' },
    title: 'How much are my clothes worth? Resale value of branded clothing',
    description: 'What decides the resale value of used jackets, jeans, dresses, hoodies and bags: brand, condition, size, season and completeness, and where to sell them.',
    h1: 'How much are my clothes worth?',
    lead: 'Second-hand clothes sell every day on Vinted and eBay, but prices range from a couple of euros to well over a hundred. The brand on the label decides most of it, the rest comes down to a few details buyers always check.',
    sections: [
      {
        h2: 'What drives the price',
        html: '<ul><li><strong>Brand:</strong> the biggest factor by far. Premium and outdoor brands keep much more of their value than fast fashion.</li><li><strong>Item type:</strong> a winter jacket or a leather bag sells for more than a T-shirt from the same brand.</li><li><strong>Named lines and styles:</strong> well-known lines such as Levi\'s 501 jeans or The North Face Nuptse jackets price differently from the brand\'s basic items, so compare like with like.</li><li><strong>Condition:</strong> new with tags, new without tags, very good, good or satisfactory. Stains, pilling, holes and faded colours lower the price.</li><li><strong>Size:</strong> common sizes sell faster; very large and very small sizes usually take longer to find a buyer.</li><li><strong>Season:</strong> coats and boots sell best in autumn and winter, light dresses and shorts in spring and summer.</li><li><strong>Completeness:</strong> a removable hood, a belt or a bag\'s dust bag help the price.</li></ul>',
      },
      {
        h2: 'Fast fashion versus premium brands',
        html: '<p>Fast-fashion brands such as Zara, H&amp;M, Bershka and Pull&amp;Bear usually resell for a few euros up to around 15 to 20, even in good condition. Premium, designer and outdoor brands are worth much more, which is also why they are copied. For valuable pieces, keep the authenticity tags and the receipt if you have them, and photograph the labels clearly: buyers ask for them.</p>',
      },
      {
        h2: 'Where to sell clothes',
        html: '<ul><li><strong>Vinted:</strong> the main marketplace for clothes in Europe. In most countries sellers pay no selling fee; the buyer pays shipping and a Buyer Protection fee on top. See <a href="/guides/how-to-sell-on-vinted">how to sell on Vinted</a>.</li><li><strong>eBay:</strong> private sellers in Germany and the UK pay no selling fees, but the seller usually pays shipping. Good for premium brands and buyers in other countries.</li><li><strong>Locally:</strong> classifieds and flea markets, with no shipping at all, but fewer buyers for each item.</li></ul>',
      },
      {
        h2: 'How FlipLens estimates clothing prices',
        html: '<p>Photograph the item and its brand label. FlipLens reads the brand and the type (women, men or kids), then compares listings of the same brand and type in the same eBay category, across eBay in five EU countries or on eBay.co.uk, and adjusts the asking prices down. By default it values clothes for Vinted, taking off typical shipping because the buyer pays it there, and shows eBay side by side. Items without a recognisable brand are not priced.</p><p>This is a rougher estimate than for electronics: FlipLens compares the brand and type, not the exact piece. Treat it as a guide to the price range, then check similar listings before you set your final price. See <a href="/guides/how-to-check-resale-value">how to check resale value</a>.</p>',
      },
      {
        h2: 'From photo to Vinted listing',
        html: '<p>Once you know the range, FlipLens can write the Vinted title and description from the same photo with the <a href="/vinted-listing-generator">Vinted listing generator</a>. Add the measurements and any flaws, and it is ready to post.</p>',
      },
    ],
    faq: [
      { q: 'Which clothing brands resell best?', a: 'Premium, designer and outdoor brands keep much more value than fast fashion. Fast-fashion items from brands like Zara or H&M usually sell for a few euros up to around 15 to 20.' },
      { q: 'Can FlipLens price unbranded clothes?', a: 'No. FlipLens compares listings of the same brand and type, so items without a recognisable brand are not priced.' },
      { q: 'Should I sell clothes on Vinted or eBay?', a: 'Vinted is usually the first choice for clothes because sellers pay no selling fee in most countries and the buyer pays shipping. eBay is worth comparing for premium brands. FlipLens shows both side by side.' },
    ],
  },
  {
    path: '/guides/sneaker-resale-value',
    kind: 'article',
    crumb: 'Sneaker resale value',
    parent: { path: '/guides', name: 'Guides' },
    title: 'Sneaker resale value: how much are my trainers worth?',
    description: 'What decides the resale value of used sneakers: model, size, condition, the original box and authenticity, plus where to sell them in Europe and the UK.',
    h1: 'Sneaker resale value: how much are my trainers worth?',
    lead: 'Sneakers are among the easiest shoes to resell, but two pairs from the same brand can be worth very different amounts. The model, the size and the condition decide most of the price.',
    sections: [
      {
        h2: 'What drives the price',
        html: '<ul><li><strong>Brand and model:</strong> named models such as the Nike Air Force 1 or the Adidas Samba price differently from a brand\'s basic trainers. Always compare the same model.</li><li><strong>Size:</strong> popular sizes sell fastest, roughly EU 40 to 44 for men and EU 37 to 39 for women. Very small or very large sizes take longer.</li><li><strong>Condition:</strong> new with tags, new without tags, very good, good or satisfactory. Buyers look at creases, worn soles, yellowed midsoles and the inside lining.</li><li><strong>Box and extras:</strong> the original box and spare laces help, especially for sought-after models.</li></ul>',
      },
      {
        h2: 'Authenticity',
        html: '<p>Popular sneakers are often faked, so buyers are careful. Photograph the size label inside the shoe, the box label and any receipt you have. Clear, honest photos sell faster than a listing that leaves buyers guessing.</p>',
      },
      {
        h2: 'Cleaning and photos',
        html: '<ul><li>Clean the uppers and soles and wash or replace the laces.</li><li>Photograph both shoes from the side, the front, the back, the soles and the size label.</li><li>Show wear and flaws close up.</li><li>Use daylight and a plain background.</li></ul>',
      },
      {
        h2: 'Where to sell sneakers',
        html: '<ul><li><strong>Vinted:</strong> no selling fee for sellers in most of Europe; the buyer pays shipping and Buyer Protection. See <a href="/guides/how-to-sell-on-vinted">how to sell on Vinted</a>.</li><li><strong>eBay:</strong> private sellers in Germany and the UK pay no selling fees, but the seller usually pays shipping.</li><li><strong>Locally:</strong> classifieds and flea markets, where buyers can try them on.</li></ul>',
      },
      {
        h2: 'Check the price with FlipLens',
        html: '<p>Photograph the sneakers and the size label. FlipLens reads the brand and type, compares listings of the same brand and type in the same eBay category across eBay in five EU countries or on eBay.co.uk, adjusts asking prices down and by default values them for Vinted, with eBay shown side by side. It compares brand and type rather than the exact pair, so treat it as a rough range. Then it can write the listing from the same photo with the <a href="/vinted-listing-generator">Vinted listing generator</a>. See also <a href="/guides/how-to-check-resale-value">how to check resale value</a>.</p>',
      },
    ],
    faq: [
      { q: 'Which sneaker sizes sell fastest?', a: 'Popular sizes, roughly EU 40 to 44 for men and EU 37 to 39 for women, usually sell fastest. Very small and very large sizes take longer.' },
      { q: 'Does the original box matter for sneakers?', a: 'Yes. The original box helps buyers trust the pair and usually helps the price, especially for sought-after models.' },
      { q: 'How accurate is the FlipLens estimate for sneakers?', a: 'It is a rough range. FlipLens compares listings of the same brand and type, not the exact model and size, so check similar listings before you set your final price.' },
    ],
  },
  {
    path: '/guides/lego-set-value',
    kind: 'article',
    crumb: 'LEGO set value',
    parent: { path: '/guides', name: 'Guides' },
    title: 'How much is my LEGO set worth? Resale value guide',
    description: 'What decides the resale value of a used LEGO set: the set number, condition, completeness, minifigures and whether it is retired, plus where to sell it.',
    h1: 'How much is my LEGO set worth?',
    lead: 'LEGO keeps its value better than most toys, but two boxes of the same set can sell for very different amounts. The set number tells you exactly what you have; condition and completeness decide the price.',
    sections: [
      {
        h2: 'Find the set number',
        html: '<p>Every LEGO set has a set number of 4 to 6 digits. You find it on the box, on the front of the instructions and in the LEGO catalogue. The set number identifies the exact set, so always compare listings of that number, not just the theme or the name.</p><p>No box and no instructions? Search the catalogue by theme and a few distinctive pieces or minifigures until you find the matching set.</p>',
      },
      {
        h2: 'Condition and completeness',
        html: '<ul><li><strong>New, sealed:</strong> factory sealed in the original box (in German listings often called OVP). Usually the highest price.</li><li><strong>New, opened:</strong> box opened, bags still sealed or unused.</li><li><strong>Used, complete:</strong> all pieces, the instructions and all minifigures.</li><li><strong>Used without box:</strong> complete set, but no box. Worth less than with the box.</li><li><strong>Incomplete:</strong> missing pieces, minifigures or instructions. Missing minifigures and instructions cut the value a lot.</li></ul><p>To check completeness, look up the inventory for the set number and tick off the parts and minifigures. Say clearly in your listing what is included.</p>',
      },
      {
        h2: 'Retired sets, current sets, bulk bricks and copies',
        html: '<ul><li><strong>Retired sets:</strong> once LEGO stops selling a set, its value often rises, especially when it is sealed or complete.</li><li><strong>Current sets:</strong> still sold in shops, so your used set competes with retail discounts and sells for less than you might expect.</li><li><strong>Bulk bricks:</strong> loose mixed bricks sell by weight. This is a separate market from complete sets.</li><li><strong>Copies:</strong> compatible bricks from other makers, such as Lepin, or listings marked "compatible" are not LEGO and are worth far less. Look for the LEGO logo on the studs.</li></ul>',
      },
      {
        h2: 'Where to sell LEGO',
        html: '<ul><li><strong>eBay:</strong> the widest audience for complete and sealed sets. Private sellers in Germany and the UK pay no selling fees, but the seller usually pays shipping.</li><li><strong>Locally:</strong> Kleinanzeigen, classifieds and flea markets, good for large sets and bulk bricks with no shipping.</li><li><strong>Vinted:</strong> works well for smaller kids\' sets.</li><li><strong>BrickLink:</strong> a marketplace for single parts and minifigures, useful if you sell them separately.</li></ul>',
      },
      {
        h2: 'Check the price with FlipLens',
        html: '<p>Take a photo of the box or the instructions. FlipLens reads the set number and compares listings of that exact set, leaving out instructions-only listings, incomplete sets, copies and bundles. It searches eBay in five EU countries or eBay.co.uk, adjusts asking prices down and shows the most to pay if you are buying to resell.</p><p>Sorting a whole box of sets? Use the "many items at once" mode: one photo per set, prices for all of them and listings written. See <a href="/guides/how-to-check-resale-value">how to check resale value</a> and the <a href="/guides/flea-market-reselling-checklist">flea market reselling checklist</a>.</p>',
      },
    ],
    faq: [
      { q: 'Where do I find the LEGO set number?', a: 'The set number has 4 to 6 digits and is printed on the box, on the front of the instructions and in the LEGO catalogue. It identifies the exact set.' },
      { q: 'How much do missing minifigures lower the value?', a: 'A lot. Minifigures and instructions are what buyers check first, so a set without them sells for much less than a complete one. Check the inventory for the set number before you sell.' },
      { q: 'Are compatible bricks like Lepin worth the same as LEGO?', a: 'No. Copies and compatible bricks are not LEGO and sell for far less. FlipLens leaves copies out when it compares prices.' },
    ],
  },
  {
    path: '/guides/resale-value-books-vinyl-dvds',
    kind: 'article',
    crumb: 'Books, vinyl, CDs and DVDs',
    parent: { path: '/guides', name: 'Guides' },
    title: 'Resale value of books, vinyl records, CDs and DVDs',
    description: 'How to find what your used books, vinyl records, CDs and DVDs are worth: barcode, edition and format, buyback services versus selling yourself.',
    h1: 'Resale value of books, vinyl records, CDs and DVDs',
    lead: 'Most books, CDs and DVDs resell for a few euros, but a few editions are worth much more. The barcode tells you exactly which edition you have, and that is where the price starts.',
    sections: [
      {
        h2: 'The barcode identifies the edition',
        html: '<p>Books carry an ISBN, music and films an EAN barcode. Both identify the exact edition, not just the title. The same novel or album can exist in many editions at very different prices, so always compare the same barcode.</p>',
      },
      {
        h2: 'Edition and format matter',
        html: '<ul><li><strong>Books:</strong> first editions, signed copies and hardcovers are usually worth more than later printings and paperbacks.</li><li><strong>Vinyl:</strong> an original pressing is often worth more than a reissue. 180g pressings, coloured vinyl and picture discs have their own prices.</li><li><strong>Films:</strong> DVD, Blu-ray and 4K are different products. Steelbooks and complete box sets often sell for more.</li><li><strong>Condition:</strong> scratches, a worn sleeve, a damaged case, notes or underlining lower the price. Missing booklets or discs in a box set lower it a lot.</li></ul>',
      },
      {
        h2: 'What is actually worth selling',
        html: '<p>Mass-market books, CDs and DVDs usually resell for a few euros each. The value is in rare editions, popular vinyl and complete box sets. For cheap items, bundles sell well: a series of books, a stack of CDs by one artist or a set of films in one listing saves shipping and time.</p>',
      },
      {
        h2: 'Buyback services or selling yourself',
        html: '<ul><li><strong>Buyback services:</strong> such as Momox and reBuy in Germany or WeBuyBooks and Ziffit in the UK. You scan the barcode, get an offer and send the items in. They pay quickly, but the price is low.</li><li><strong>eBay and Vinted:</strong> selling yourself takes more effort, but usually brings more for valuable editions, vinyl and box sets.</li><li><strong>Locally:</strong> flea markets and classifieds, good for bundles and boxes of cheap items.</li></ul>',
      },
      {
        h2: 'Check the price with FlipLens',
        html: '<p>Scan the barcode or take a photo of the cover. FlipLens searches the exact edition by its barcode on eBay in five EU countries or eBay.co.uk, adjusts asking prices down and shows the most to pay if you are buying to resell.</p><p>For a box of books or a stack of records, use the "many items at once" mode: one photo per item, prices for all of them and listings written. See <a href="/guides/how-to-check-resale-value">how to check resale value</a> and the <a href="/guides/flea-market-reselling-checklist">flea market reselling checklist</a>.</p>',
      },
    ],
    faq: [
      { q: 'Are my old books and DVDs worth anything?', a: 'Most mass-market books, CDs and DVDs resell for a few euros. Rare editions, popular vinyl and complete box sets are worth more. Check the barcode to find the exact edition.' },
      { q: 'Should I use a buyback service or sell myself?', a: 'Buyback services pay quickly but low. Selling yourself on eBay or Vinted usually brings more for valuable items, while cheap items often sell best as bundles.' },
      { q: 'Can FlipLens price a whole box of books or records?', a: 'Yes. In "many items at once" mode you take one photo per item, and FlipLens prices all of them and writes the listings.' },
    ],
  },
  {
    path: '/about',
    kind: 'page',
    crumb: 'About',
    title: 'About FlipLens: independent resale value checker for the UK and Europe',
    description: 'Who runs FlipLens, where its prices come from and the principles behind it: no photos stored, no eBay data stored, honest about uncertainty, independent of eBay and Vinted.',
    h1: 'About FlipLens',
    lead: 'FlipLens helps people who buy second-hand to resell decide in seconds whether an item is worth it, using real marketplace data from across Europe.',
    sections: [
      {
        h2: 'What it is',
        html: '<p>A web app for resellers and bargain hunters. Take a photo, scan a barcode or type a model, and FlipLens shows the resale range, your profit after fees and shipping, the most you should pay and a clear verdict. It also writes listings for Vinted, eBay and Kleinanzeigen from a photo and tracks what you bought and sold.</p>',
      },
      {
        h2: 'Who runs it',
        html: `<p>FlipLens is run by ${esc(LEGAL.operator)} in Slovenia. Contact: <a href="mailto:${LEGAL.supportEmail}">${LEGAL.supportEmail}</a>. Creators and partners: see the <a href="/partner">partner programme</a>.</p>`,
      },
      {
        h2: 'Where the data comes from',
        html: '<p>Prices come from active eBay listings, read through the official eBay API: in Germany, France, Italy, Spain and the Netherlands, converted to euro with European Central Bank exchange rates, or on eBay.co.uk in pounds for sellers in the UK. Item recognition uses an AI vision model. Details and limits are explained in <a href="/how-it-works">how it works</a>.</p>',
      },
      {
        h2: 'Principles',
        html: '<ul><li><strong>Photos are never stored.</strong> They are only used to identify the item or write the listing.</li><li><strong>No eBay data is stored.</strong> Listings are read live and cached briefly, as the eBay API licence requires.</li><li><strong>Honest about uncertainty.</strong> Every estimate shows its confidence; with too little data FlipLens says so instead of guessing.</li><li><strong>Independent.</strong> FlipLens is not affiliated with eBay, Vinted or Kleinanzeigen and does not buy, sell or ship items.</li></ul>',
      },
      {
        h2: 'Languages',
        html: '<p>FlipLens is available in English, German, Italian and French. The app follows your browser language; German pages are under <a href="/de" hreflang="de" lang="de">fliplens.eu/de</a>, Italian under <a href="/it" hreflang="it" lang="it">fliplens.eu/it</a> and French under <a href="/fr" hreflang="fr" lang="fr">fliplens.eu/fr</a>. See also the <a href="/privacy">Privacy Policy</a> and <a href="/terms">Terms</a>.</p>',
      },
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

// ---------- German ----------

// ---------- partner programme (referrals) ----------


PAGES.push({
  path: '/partner',
  kind: 'page',
  crumb: 'Partner programme',
  cta: `<p class="cta"><a class="btn" href="/">Get your link</a><span>Sign in with Google, open Profile, "Invite friends". Free to join.</span></p>`,
  title: `FlipLens partner programme: earn ${REFERRAL.sharePct}% for ${REFERRAL.months} months`,
  description: `Recommend FlipLens to resellers and earn ${REFERRAL.sharePct}% of every payment from the people you invite, for ${REFERRAL.months} months. Your audience gets ${INVITE_BONUS_CHECKS} extra free checks. Payouts from ${eur(REFERRAL.minPayoutMinor)}.`,
  h1: `Earn ${REFERRAL.sharePct}% for ${REFERRAL.months} months`,
  lead: 'Make videos about flea market finds, flips or selling on Vinted? Show your audience FlipLens and earn from every person who subscribes through your link.',
  sections: [
    {
      h2: 'Who it is for',
      html: '<p>Resellers and creators on TikTok, Instagram and YouTube who post about flea markets, thrift finds, flipping electronics or selling on Vinted, eBay and Kleinanzeigen. Normal users can join too: everyone with a FlipLens account gets an invite link.</p>',
    },
    {
      h2: 'What you earn',
      html: `<ul><li><strong>${REFERRAL.sharePct}% of every payment</strong> made by people who sign up with your link, without taxes.</li><li>For <strong>${REFERRAL.months} months</strong> from each person's first payment, renewals included.</li><li>Earnings become available ${REFERRAL.holdDays} days after each payment (the refund period).</li><li>Payouts from ${eur(REFERRAL.minPayoutMinor)} by PayPal or bank transfer, requested in the app.</li></ul><p>Example: ${EXAMPLE_PEOPLE} people on Pro (${eur(PLANS.pro.priceMonthlyMinor)} a month) bring you about <strong>${eur(exampleMinor)} a month</strong> for ${REFERRAL.months} months.</p>`,
    },
    {
      h2: 'What your audience gets',
      html: `<p>People who create a new account with your link get <strong>${INVITE_BONUS_CHECKS} extra free checks</strong> in their first month, on top of the free plan. They can check what an item resells for, see their profit after fees and write Vinted, eBay or Kleinanzeigen listings from a photo.</p>`,
    },
    {
      h2: 'How to join',
      html: `<ol><li>Sign in at <a href="/">fliplens.eu</a> with Google.</li><li>Open Profile, then "Invite friends".</li><li>Copy your link (fliplens.eu/?ref=yourcode) and share it in your bio, videos and stories.</li></ol><p>Want a custom code such as <code>?ref=anna</code>? Write to <a href="mailto:${LEGAL.supportEmail}">${LEGAL.supportEmail}</a> after signing in.</p>`,
    },
    {
      h2: 'Content ideas',
      html: '<ul><li>Flea market check: "Is it worth buying?" with the verdict on screen.</li><li>Before and after flips with the real profit.</li><li>"I turned this into a Vinted listing in 10 seconds."</li><li>Share-your-find cards from the app in your stories.</li></ul>',
    },
    {
      h2: 'Rules',
      html: '<ul><li>Label sponsored content as advertising (in Germany "Werbung" or "Anzeige").</li><li>No misleading claims about earnings or results, no spam.</li><li>No search ads on the FlipLens name, no self-referrals or extra accounts.</li></ul><p>Full rules: <a href="/terms">Terms</a>, section "Referral programme".</p>',
    },
    {
      h2: 'Brand assets',
      html: '<p><a href="/og.png">Preview image (1200×630)</a> · <a href="/icons/icon-512.png">App icon (512×512)</a></p>',
    },
  ],
  faq: [
    { q: 'Does it cost anything to join?', a: 'No. Every signed-in user has an invite link, and the free plan is enough to take part.' },
    { q: 'How long do I earn from a person I invite?', a: `${REFERRAL.months} months from their first payment. You receive ${REFERRAL.sharePct}% of every payment in that time, renewals included.` },
    { q: 'When and how do I get paid?', a: `Earnings become available ${REFERRAL.holdDays} days after each payment. From ${eur(REFERRAL.minPayoutMinor)} you can request a payout by PayPal or bank transfer in the app; it is usually paid within 14 days.` },
    { q: 'Who pays taxes on my earnings?', a: 'You do. Earnings are paid without tax deductions; declare them as required in your country.' },
  ],
});

/** German money: "9,99 €". */
const deEur = (minor: number): string => `${(minor / 100).toFixed(2).replace('.', ',').replace(/,00$/, '')} €`;
const deNum = (n: number): string => n.toLocaleString('de-DE');

/** German plan feature lines (keep in step with apps/web/src/i18n.ts). */
const DE_FEATURES: Record<string, readonly string[]> = PLAN_FEATURES_BY_LANG.de;

const CTA_DE = `<p class="cta"><a class="btn" href="/de">Kostenlos prüfen</a><span>${PLANS.free.monthlyValuations} Checks pro Monat gratis. Zwei Checks kannst du ganz ohne Konto testen. Keine Karte nötig.</span></p>`;
const LISTING_CTA_DE = `<p class="cta"><a class="btn" href="/de?tool=listing">Anzeige kostenlos schreiben</a><span>${PLANS.free.monthlyListings} Anzeigen pro Monat gratis. Eine kannst du ganz ohne Konto testen. Keine Karte nötig.</span></p>`;

const COMMON_FAQ_DE: Faq[] = [
  {
    q: 'Was ist FlipLens?',
    a: 'FlipLens ist eine Web-App für Reseller in Europa. Mach ein Foto, scann den Barcode oder tipp das Modell ein: FlipLens zeigt dir, wofür der Artikel auf eBay in Deutschland, Frankreich, Italien, Spanien und den Niederlanden oder auf eBay.co.uk in Großbritannien weiterverkauft wird, deinen Gewinn nach Gebühren und Versand, den Höchstpreis, den du zahlen solltest, und ein klares Urteil: Klarer Kauf, Kaufen, Grenzwertig oder Finger weg.',
  },
  {
    q: 'Woher kommen die Preise?',
    a: 'Aus aktiven eBay-Angeboten, abgerufen über die offizielle eBay-API: eBay in fünf EU-Ländern in Euro (mit EZB-Wechselkursen umgerechnet) oder eBay.co.uk in Pfund, wenn du in Großbritannien verkaufst. Angebotspreise liegen meist über dem, wofür Artikel am Ende verkauft werden. Deshalb rechnet FlipLens sie herunter und zeigt immer, auf wie vielen Angeboten eine Schätzung beruht. Du kannst jedes verwendete Angebot öffnen.',
  },
  {
    q: 'Welche Artikel funktionieren am besten?',
    a: 'Unterhaltungselektronik, Gaming und Kameras: Kopfhörer, Smartphones, Tablets, Laptops, Smartwatches, Lautsprecher, Konsolen, Handhelds, Controller, Spiele, Kameragehäuse, Objektive, Action- und Kompaktkameras sowie Elektrowerkzeuge. Markenkleidung, Schuhe und Taschen werden auch bewertet, nach Marke, Art und Zustand (gröber als bei Elektronik). LEGO-Sets nach Setnummer; Bücher, Schallplatten, CDs und DVDs per Barcode. Uhren nach Modell; Markenschmuck nach Marke und Art (Gold und Silber ohne Marke, Möbel und Fahrzeuge werden nicht bewertet).',
  },
  {
    q: 'Muss ich einen Preis eingeben?',
    a: 'Nein. Ohne Preis zeigt FlipLens, wofür der Artikel verkauft wird und wie viel du für deine Zielrendite höchstens zahlen solltest. Mit Preis bekommst du Urteil, Gewinn und ROI für genau diesen Deal.',
  },
  {
    q: 'Was passiert mit meinen Fotos und Daten?',
    a: 'Fotos werden nur zur Erkennung des Artikels verwendet und nie gespeichert. Deine Checks bleiben gespeichert, bis du sie löschst. In deinem Profil kannst du jederzeit alles exportieren oder löschen.',
  },
  {
    q: 'Gehört FlipLens zu eBay?',
    a: 'Nein. FlipLens ist unabhängig und zeigt eBay-Daten über die offizielle eBay-API. FlipLens kauft, verkauft und versendet nichts.',
  },
];

/** German versions, same base paths as PAGES (published under /de). Links inside point to German pages. */
const PAGES_DE: Page[] = [
  {
    path: '/how-it-works',
    kind: 'page',
    crumb: "So funktioniert's",
    title: 'So schätzt FlipLens Wiederverkaufswert und Gewinn',
    description: 'Wie FlipLens das genaue Produkt erkennt, Vergleichsangebote auf eBay in fünf EU-Ländern oder Großbritannien findet, den Wiederverkaufswert schätzt, Gebühren und Versand abzieht und zwischen Klarer Kauf, Kaufen, Grenzwertig und Finger weg entscheidet.',
    h1: "So funktioniert's",
    lead: 'FlipLens beantwortet eine Frage: "Ich kann das für X € kaufen. Lohnt es sich zum Weiterverkaufen?" Hier steht genau, wie die Antwort entsteht, auch wo sie danebenliegen kann.',
    sections: [
      {
        h2: '1. Das genaue Produkt erkennen',
        html: '<p>Du fotografierst den Artikel oder sein Typenschild, scannst den Barcode auf der Verpackung oder tippst das Modell ein. Fotos erkennt ein KI-Bildmodell; Barcodes (EAN und UPC) werden mit Marktplatz-Angeboten abgeglichen. FlipLens achtet auf die Details, die den Preis verändern: Modellgeneration (WH-1000XM4 ist nicht XM5), Speicher (128 GB ist nicht 256 GB), Objektivanschluss (RF ist nicht EF) und Zustand. Vor dem Check kannst du alles korrigieren.</p>',
      },
      {
        h2: '2. Vergleichsangebote finden',
        html: '<p>FlipLens durchsucht aktuelle eBay-Angebote über die offizielle eBay-API: in Deutschland, Frankreich, Italien, Spanien und den Niederlanden, mit Preisen zu Kursen der Europäischen Zentralbank in Euro umgerechnet, oder auf eBay.co.uk in Pfund, wenn du in Großbritannien verkaufst (dort Standard, aus jedem Land wählbar). Ein Tipp im Ergebnis zeigt den Vergleich UK vs. EU: denselben Artikel auf eBay.co.uk und auf den fünf EU-Seiten nebeneinander, in Pfund und Euro, ohne einen Check zu verbrauchen. Danach fliegt raus, was den Preis verfälschen würde: andere Modelle und Varianten, einzeln verkauftes Zubehör, Bundles, defekte Artikel und Bastlerware, Duplikate und Angebote in einem ganz anderen Zustand. Du siehst jedes verwendete Angebot und warum andere aussortiert wurden.</p>',
      },
      {
        h2: '3. Den Wiederverkaufswert schätzen',
        html: '<p>Aus den übrigen Angeboten baut FlipLens eine Preisverteilung, angepasst an den Zustand deines Artikels, und nennt drei Werte: einen Schnellverkaufspreis, den erwarteten Verkaufspreis und einen hohen Angebotspreis. Weil Angebotspreise meist über den tatsächlichen Verkaufspreisen liegen, wird die Schätzung nach unten korrigiert. Jede Schätzung hat einen Sicherheitswert: wie viele Angebote passen, wie einig sie sich sind und wie gut das Produkt erkannt wurde.</p>',
      },
      {
        h2: '4. Gewinn nach Gebühren berechnen',
        html: '<p>FlipLens zieht die Verkaufsgebühren deines Marktplatzes ab (zum Beispiel eBay.de privat oder gewerblich, eBay.co.uk privat, Vinted oder Abholung vor Ort), dazu deine Versandkosten und den Einkaufspreis. Ergebnis: Gewinn, Rendite (ROI) und der <strong>Höchstpreis, der sich noch lohnt</strong>, für deine Zielrendite: Höchstpreis = was dir nach Gebühren und Versand bleibt ÷ (1 + Zielrendite).</p>',
      },
      {
        h2: '5. Ein Urteil geben oder zugeben, dass die Daten fehlen',
        html: '<p>Das Urteil lautet Klarer Kauf, Kaufen, Grenzwertig oder Finger weg, mit den Gründen und Risiken dahinter. Bleiben weniger als fünf passende Angebote übrig oder ist die Erkennung zu unsicher, sagt FlipLens "nicht genug Marktdaten", statt eine Zahl zu erfinden.</p>',
      },
      {
        h2: 'Bekannte Grenzen',
        html: '<ul><li>Die Preise beruhen auf aktiven Angeboten (Angebotspreisen), nicht auf bestätigten Verkaufspreisen.</li><li>Das Angebot ist sichtbar (wie viele Artikel wie lange angeboten werden), das Verkaufstempo noch nicht.</li><li>Sammlerstücke und Einzelstücke werden nicht unterstützt. Kleidung, Schuhe und Taschen werden nach Marke, Art und Zustand bewertet, nicht als genaues Einzelteil.</li><li>Gebühren ändern sich: Jedes Gebührenprofil zeigt, wann es zuletzt geprüft wurde, und verlinkt seine Quelle.</li></ul>',
      },
    ],
  },
  {
    path: '/pricing',
    kind: 'page',
    crumb: 'Preise',
    title: `FlipLens Preise: kostenlose Checks, Pro ${deEur(PLANS.pro.priceMonthlyMinor)}, Reseller ${deEur(PLANS.reseller.priceMonthlyMinor)}`,
    description: `Free: ${PLANS.free.monthlyValuations} Checks pro Monat. Pro ${deEur(PLANS.pro.priceMonthlyMinor)}: ${PLANS.pro.monthlyValuations} Checks und Anzeigen-Generator. Reseller ${deEur(PLANS.reseller.priceMonthlyMinor)}: bis zu ${deNum(PLANS.reseller.monthlyValuations)} Checks. Endpreise, jederzeit kündbar.`,
    h1: 'Einfache Preise',
    lead: 'Starte kostenlos. Upgrade, wenn sich FlipLens bezahlt macht: Ein guter Fund deckt meist einen ganzen Monat.',
    sections: [
      {
        h2: 'Tarife',
        html: `<table><thead><tr><th>Tarif</th><th>Preis</th><th>Enthalten</th></tr></thead><tbody>${plans
          .map((p) => `<tr><td><strong>${esc(p.name)}</strong></td><td>${p.priceMonthlyMinor ? `${deEur(p.priceMonthlyMinor)} / Monat` : 'Kostenlos'}</td><td>${(DE_FEATURES[p.id] ?? []).map(esc).join('<br>')}</td></tr>`)
          .join('')}</tbody></table><p>Endpreise, keine versteckten Kosten. Die Zahlung läuft über Stripe. Du kannst jederzeit im Kundenportal kündigen. Verbraucher in der EU haben ein 14-tägiges Widerrufsrecht, siehe die <a href="/terms">Nutzungsbedingungen</a>.</p>`,
      },
      {
        h2: 'Was als Check zählt',
        html: '<p>Ein Check ist eine Bewertung: FlipLens schaut sich den Markt an und berechnet Wiederverkaufswert, Gewinn und Urteil. Die Erkennung per Foto oder Barcode ist inklusive. Die Checks werden am 1. jedes Monats zurückgesetzt.</p>',
      },
    ],
    faq: [
      { q: 'Gibt es einen kostenlosen Tarif?', a: `Ja. ${PLANS.free.name} enthält ${PLANS.free.monthlyValuations} Checks pro Monat mit Foto- und Barcode-Erkennung, Gewinn und ROI, Lager und ${PLANS.free.monthlyListings} KI-Anzeigen. Keine Karte nötig.` },
      { q: 'Was bringen die bezahlten Tarife?', a: paid.map((p) => `${p.name} (${deEur(p.priceMonthlyMinor)}/Monat): ${(DE_FEATURES[p.id] ?? []).join(', ')}.`).join(' ') },
      { q: 'Kann ich jederzeit kündigen?', a: 'Ja. Kündige im Kundenportal über dein Profil; der Tarif bleibt bis zum Ende des bezahlten Monats aktiv.' },
    ],
  },
  {
    path: '/faq',
    kind: 'page',
    crumb: 'FAQ',
    title: 'FlipLens FAQ: Wiederverkaufswert-Checks für Reseller in Europa',
    description: 'Antworten zu FlipLens: woher die Preise kommen, welche Artikel und Länder unterstützt werden, Genauigkeit, Datenschutz, Preise und Installation der App.',
    h1: 'Häufige Fragen',
    lead: 'Kurze Antworten dazu, wie FlipLens funktioniert und was es kann und nicht kann.',
    sections: [],
    faq: [
      ...COMMON_FAQ_DE,
      { q: 'Kann FlipLens einen ganzen Tisch auf einmal prüfen?', a: 'Ja. Mach ein Foto von einem Stand, einer Kiste oder einem Regal, und FlipLens findet bis zu 6 Artikel, prüft jeden mit echten eBay-Angeboten (ein Check pro Artikel) und zeigt die besten Käufe zuerst. Oder lass die Kamera mit dem Live-Radar offen: Artikel bekommen beim Bewegen einen Rahmen mit Namen, ein Tipp prüft den Preis. Preise kommen immer aus einem echten Check, nie aus einer Schätzung. Beides braucht eine Google-Anmeldung.' },
      { q: 'Welche Länder deckt FlipLens ab?', a: 'Großbritannien und fünf EU-Länder. Wenn du auf eBay.co.uk verkaufst (Standard, wenn dein Land Großbritannien ist), nutzt FlipLens Angebote von eBay.co.uk und zeigt Preise in Pfund, mit den Gebühren für private Verkäufer in Großbritannien. Sonst kommen die Marktdaten von eBay Deutschland, Frankreich, Italien, Spanien und den Niederlanden, in Euro. Im Profil kannst du unabhängig vom Land eBay.de oder eBay.co.uk wählen, und der Vergleich UK vs. EU im Ergebnis zeigt denselben Artikel auf eBay.co.uk und auf den fünf EU-Seiten nebeneinander, in Pfund und Euro, ohne einen Check zu verbrauchen. Links, um Preise selbst zu prüfen, gibt es für Vinted, Kleinanzeigen und weitere Marktplätze.' },
      { q: 'Wie genau ist die Schätzung?', a: 'Das hängt vom Markt ab. Jedes Ergebnis zeigt einen Sicherheitswert, auf wie vielen Angeboten es beruht und die Risiken. Gibt es nicht genug Daten, sagt FlipLens das, statt zu raten. Im Lager kannst du deine echten Verkaufspreise festhalten und sehen, wie nah die Schätzungen lagen.' },
      { q: 'Für welche Marktplätze werden die Gebühren berechnet?', a: 'eBay.de für private und gewerbliche Verkäufer, eBay.co.uk für private Verkäufer, Vinted und Abholung gegen Bargeld. Jedes Gebührenprofil zeigt, wann es zuletzt geprüft wurde.' },
      { q: 'Kann FlipLens meine Anzeige schreiben?', a: `Ja. Fotografier einen beliebigen Artikel, auch Kleidung, und FlipLens schreibt Titel, Beschreibung und Zustandstext im Stil von Vinted, eBay oder Kleinanzeigen, in deiner Sprache und fertig zum Kopieren. Free enthält ${PLANS.free.monthlyListings} Anzeigen pro Monat, Pro ${PLANS.pro.monthlyListings}. FlipLens veröffentlicht nie etwas in deinem Namen.` },
      { q: 'Gibt es eine App fürs Handy?', a: 'FlipLens ist eine Web-App, die du auf dem Handy installieren kannst: Öffne fliplens.eu und wähle "Zum Home-Bildschirm" (iPhone) oder "App installieren" (Android). Danach startet sie im Vollbild wie eine normale App.' },
      { q: 'Warum muss ich mich anmelden?', a: 'Deine kostenlosen Checks, dein Verlauf und dein Tarif gehören zu deinem Konto und funktionieren so auf allen Geräten. Die Anmeldung mit Google geht mit einem Tipp, ein Passwort brauchst du nicht.' },
    ],
  },
  {
    path: '/guides/how-to-check-resale-value',
    kind: 'article',
    crumb: 'Wiederverkaufswert prüfen',
    parent: { path: '/guides', name: 'Ratgeber' },
    title: 'Wiederverkaufswert vor dem Kauf prüfen: so geht\'s (Europa)',
    description: 'Eine Schritt-für-Schritt-Methode, um herauszufinden, wofür sich ein gebrauchter Artikel in Europa wirklich weiterverkaufen lässt, Gebühren und Versand abzuziehen und den Höchstpreis zu berechnen.',
    h1: 'Wiederverkaufswert vor dem Kauf prüfen',
    lead: 'Auf dem Flohmarkt oder bei Kleinanzeigen hast du meist eine Minute für die Entscheidung. Das ist die Methode, die Reseller nutzen, und genau die automatisiert FlipLens.',
    sections: [
      {
        h2: '1. Das genaue Modell festnageln',
        html: '<p>Die Preisunterschiede zwischen Varianten sind oft größer als zwischen Zuständen. Lies die Modellnummer auf dem Typenschild, der Verpackung oder in den Einstellungen ab. Prüf Speichergröße, Modellgeneration, Farbe, wo sie zählt, und bei Objektiven den Anschluss. "Sony Kopfhörer" ist kein Preis; "Sony WH-1000XM4" schon.</p>',
      },
      {
        h2: '2. Vergleichsangebote ansehen, nicht den ersten Treffer',
        html: '<p>Such das genaue Modell auf eBay und sortier aus, was nicht vergleichbar ist: andere Generationen, einzeln verkauftes Zubehör, Bundles mit Spielen oder Zusatzobjektiven, Bastlerware und Angebote von weit weg mit teurem Versand. Schau in mehrere Länder: Derselbe Artikel kann in Deutschland, Frankreich oder Italien spürbar unterschiedlich viel bringen.</p>',
      },
      {
        h2: '3. Angebotspreis und Zustand berücksichtigen',
        html: '<p>Die meisten Anzeigen zeigen Angebotspreise, und verkauft wird meist darunter. Nimm die Mitte der realistischen Spanne, nicht das teuerste Angebot, und berücksichtige den Zustand: Ein "guter" Artikel bringt keinen "wie neu"-Preis. Gibt es nur eine Handvoll Vergleichsangebote, sei bei jeder Schätzung vorsichtig.</p>',
      },
      {
        h2: '4. Gebühren und Versand abziehen',
        html: '<p>Dir bleibt der Verkaufspreis minus Marktplatzgebühren und den Versand, den du zahlst. Auf eBay.de zahlen private Verkäufer innerhalb Deutschlands keine Verkaufsgebühren, gewerbliche schon; auf Vinted zahlt der Käufer die Gebühren. Siehe <a href="/de/guides/ebay-fees-germany">eBay.de-Gebühren für private und gewerbliche Verkäufer</a> und <a href="/de/guides/where-to-sell-used-electronics-europe">wo du gebrauchte Elektronik in Europa verkaufst</a>.</p>',
      },
      {
        h2: '5. Deinen Höchstpreis ausrechnen',
        html: '<p>Leg deine Wunschrendite fest und teil das, was dir bleibt, durch 1 plus diese Rendite. Beispiel: Eine Nintendo Switch OLED wird voraussichtlich für 176 € verkauft, keine Verkaufsgebühr, 6 € Versand, also bleiben dir 170 €. Für 40 % Rendite zahlst du höchstens 170 € ÷ 1,4 = <strong>121 €</strong>. Alles darunter ist ein Kauf; darüber verhandelst du oder gehst weiter.</p>',
      },
      {
        h2: 'In Sekunden mit FlipLens',
        html: '<p>FlipLens erledigt alle fünf Schritte aus einem Foto, einem Barcode oder einem eingetippten Modell: Es erkennt die genaue Variante, liest Vergleichsangebote auf eBay in fünf EU-Ländern oder auf eBay.co.uk, berücksichtigt Zustand und Angebotspreise, zieht deine Marktplatzgebühren und den Versand ab und zeigt den Höchstpreis, der sich noch lohnt. Den Preis des Verkäufers musst du dafür nicht einmal kennen.</p>',
      },
    ],
    faq: [
      { q: 'Woher weiß ich, wofür sich etwas weiterverkaufen lässt?', a: 'Erkenn das genaue Modell, vergleich es mit ähnlichen Angeboten im gleichen Zustand, nimm die realistische Mitte der Spanne statt des höchsten Angebotspreises und zieh dann Verkaufsgebühren und Versand ab.' },
      { q: 'Wie viel sollte ich für einen Artikel zahlen, den ich weiterverkaufen will?', a: 'Teil das, was dir nach Gebühren und Versand bleibt, durch 1 plus deine Zielrendite. Bei 170 € und 40 % Ziel zahlst du höchstens 121 €.' },
    ],
  },
  {
    path: '/guides/ebay-fees-germany',
    kind: 'article',
    crumb: 'eBay.de-Gebühren',
    parent: { path: '/guides', name: 'Ratgeber' },
    title: 'eBay.de-Gebühren 2026: privat vs. gewerblich',
    description: 'Was Verkaufen auf eBay Deutschland private und gewerbliche Verkäufer kostet, mit einem Beispiel, wie Gebühren deinen Gewinn und deinen Einkaufspreis verändern.',
    h1: 'eBay.de-Gebühren 2026: privat vs. gewerblich',
    lead: 'Ob du privat oder gewerblich verkaufst, verändert deine Marge bei jedem Artikel. Hier ist der Unterschied und wie du ihn einrechnest. Prüf die aktuellen Gebühren immer auf den Seiten von eBay, bevor du dich darauf verlässt.',
    sections: [
      {
        h2: 'Private Verkäufer',
        html: '<p>Seit dem 1. März 2023 zahlen private Verkäufer auf eBay.de für Verkäufe innerhalb Deutschlands <strong>keine Verkaufsgebühren</strong>. Optionale Extras, etwa manche Angebotsupgrades und der Verkauf ins Ausland, können trotzdem Geld kosten. Quelle: <a href="https://www.ebay.de/help/selling/fees-credits-invoices/gebhren-fr-private-verkufer-die-der-zahlungsabwicklung-teilnehmen?id=4822">eBay.de-Hilfe: Gebühren für private Verkäufer</a>.</p>',
      },
      {
        h2: 'Gewerbliche Verkäufer',
        html: '<p>Gewerbliche Verkäufer zahlen eine Verkaufsprovision, die von der Kategorie abhängt und davon, ob der Artikel neu oder gebraucht ist. Bei unserer letzten Prüfung (September 2026) lagen die Sätze für die Kategorien, die FlipLens abdeckt, ungefähr bei:</p><table><thead><tr><th>Artikel</th><th>Gebühr</th></tr></thead><tbody><tr><td>Gebrauchte oder generalüberholte Elektronik</td><td>5 %</td></tr><tr><td>Neue Elektronik</td><td>7 %</td></tr><tr><td>Zubehör</td><td>12 %</td></tr><tr><td>Werkzeug</td><td>13 %</td></tr><tr><td>Pro Bestellung über 10 €</td><td>+ 0,45 €</td></tr></tbody></table><p>Diese Werte stammen aus einer Sekundärquelle und die Kategorien haben Ausnahmen. Prüf deshalb die aktuelle Gebührentabelle von eBay für deine Kategorie.</p>',
      },
      {
        h2: 'Beispiel: derselbe Artikel, zwei Verkäufertypen',
        html: '<p>Eine gebrauchte Nintendo Switch OLED wird für 176 € verkauft und du zahlst 6 € Versand.</p><ul><li>Privat: keine Verkaufsgebühr, dir bleiben 170 €. Für 40 % Rendite kannst du bis zu 121 € zahlen.</li><li>Gewerblich: etwa 5 % (8,80 €) plus 0,45 €, dir bleiben etwa 160,75 €. Für 40 % Rendite kannst du bis zu etwa 114 € zahlen.</li></ul><p>Ein paar Euro Unterschied pro Artikel summieren sich über einen Monat Einkauf. Stell deinen Verkäufertyp in FlipLens deshalb richtig ein: Dann nutzt jeder Check die passenden Gebühren.</p>',
      },
      {
        h2: 'Privat oder gewerblich: was bin ich?',
        html: '<p>Wenn du Artikel mit der Absicht kaufst, sie regelmäßig weiterzuverkaufen, gilt das steuer- und verbraucherrechtlich meist als gewerbliche Tätigkeit, auch wenn du nebenbei angefangen hast. Das ist eine allgemeine Information, keine Rechts- oder Steuerberatung: Prüf die Regeln in deinem Land oder frag eine Steuerberatung.</p>',
      },
    ],
    faq: [
      { q: 'Zahlen private Verkäufer Gebühren auf eBay.de?', a: 'Seit dem 1. März 2023 keine Verkaufsgebühren für Verkäufe innerhalb Deutschlands. Optionale Extras und der Verkauf ins Ausland können Geld kosten.' },
      { q: 'Was zahlen gewerbliche Verkäufer auf eBay.de?', a: 'Eine Verkaufsprovision nach Kategorie und Zustand; Stand September 2026 etwa 5 % für gebrauchte und 7 % für neue Elektronik, plus 0,45 € pro Bestellung über 10 €. Prüf die aktuelle Gebührentabelle von eBay.' },
    ],
  },
  {
    path: '/guides/where-to-sell-used-electronics-europe',
    kind: 'article',
    crumb: 'Wo Elektronik verkaufen',
    parent: { path: '/guides', name: 'Ratgeber' },
    title: 'Gebrauchte Elektronik in Europa verkaufen: eBay, Vinted, Kleinanzeigen oder vor Ort',
    description: 'eBay, Vinted, Kleinanzeigen und Barverkauf vor Ort im Vergleich für gebrauchte Elektronik in Europa: wer Gebühren zahlt, Reichweite, Tempo und wann sich was lohnt.',
    h1: 'Wo du gebrauchte Elektronik in Europa verkaufst',
    lead: 'Der beste Marktplatz hängt vom Artikel ab, davon, wie schnell du verkaufen willst, und wer die Gebühren zahlt. Ein schneller Vergleich für Reseller in der EU.',
    sections: [
      {
        h2: 'eBay: die größte Reichweite',
        html: '<p>eBay hat Länderseiten in ganz Europa (Deutschland, Frankreich, Italien, Spanien, die Niederlande und mehr) und Käufer, die nach dem genauen Modell suchen. Das passt für Artikel mit klarer Modellnummer: Konsolen, Handys, Kopfhörer, Kameras und Objektive. Private Verkäufer zahlen innerhalb Deutschlands keine Verkaufsgebühren; gewerbliche zahlen eine Gebühr je nach Kategorie. Siehe <a href="/de/guides/ebay-fees-germany">eBay.de-Gebühren</a>.</p>',
      },
      {
        h2: 'Vinted: keine Gebühren für Verkäufer',
        html: '<p>Auf Vinted zahlt der Verkäufer keine Gebühr: Der Käufer zahlt eine Käuferschutzgebühr und den Versand obendrauf. Für den Käufer wirkt dein Preis dadurch höher, deshalb solltest du Artikel eventuell etwas günstiger einstellen. Gut geeignet für kleine, leicht zu versendende Elektronik und Gaming.</p>',
      },
      {
        h2: 'Kleinanzeigen: lokal in Deutschland',
        html: '<p>Kleinanzeigen ist die große Kleinanzeigen-Plattform in Deutschland. Einfache Anzeigen sind für private Verkäufer kostenlos, viele Käufer holen lieber ab und rechnen mit Verhandeln. Starte also etwas über deinem Zielpreis. Gut für sperrige oder schwere Artikel, bei denen der Versand die Marge auffressen würde.</p>',
      },
      {
        h2: 'Abholung und Bargeld',
        html: '<p>Keine Gebühren und kein Versand, aber weniger Interessenten und langsamere Verkäufe. Lohnt sich bei großen Artikeln oder wenn du schon einen Käufer hast.</p>',
      },
      {
        h2: 'Vor dem Kauf vergleichen',
        html: '<p>Stell in FlipLens den Marktplatz ein, auf dem du meist verkaufst, dann nutzt jeder Check dessen Gebühren und Versandregeln. Das Ergebnis verlinkt außerdem Vinted, Kleinanzeigen und weitere Marktplätze, damit du lokale Preise selbst ansehen kannst.</p>',
      },
    ],
    faq: [
      { q: 'Elektronik besser auf eBay oder Vinted verkaufen?', a: 'eBay erreicht mehr Käufer, die nach dem genauen Modell suchen, und passt zu teureren Artikeln; auf Vinted zahlt der Verkäufer keine Gebühr, weil der Käufer den Käuferschutz zahlt. Das funktioniert gut für kleine Artikel. Vergleich, was dir nach Gebühren und Versand bleibt.' },
      { q: 'Wer zahlt auf Vinted die Gebühren?', a: 'Der Käufer. Vinted berechnet dem Käufer eine Käuferschutzgebühr und den Versand; der Verkäufer bekommt den eingestellten Preis.' },
    ],
  },
  {
    path: '/guides/flea-market-reselling-checklist',
    kind: 'article',
    crumb: 'Flohmarkt-Checkliste',
    parent: { path: '/guides', name: 'Ratgeber' },
    title: 'Flohmarkt-Checkliste für Reseller: was du vor dem Elektronik-Kauf prüfen solltest',
    description: 'Eine praktische Checkliste für den Kauf gebrauchter Elektronik, Konsolen und Kameras auf Flohmärkten zum Weiterverkauf: Erkennung, Test, Vollständigkeit, Sperren und Preis.',
    h1: 'Flohmarkt-Checkliste für Reseller',
    lead: 'Die meisten Fehlkäufe sind nicht zu teuer, sondern die falsche Variante, unvollständig oder gesperrt. Geh das hier durch, bevor du das Geld rüberreichst.',
    sections: [
      {
        h2: 'Bevor du losgehst',
        html: '<ul><li>Lad dein Handy auf und nimm eine Powerbank mit: Du prüfst Preise direkt vor Ort.</li><li>Nimm kleine Scheine und Münzen mit, frühmorgens haben Verkäufer selten Wechselgeld.</li><li>Kenn deinen Höchstpreis pro Artikeltyp oder prüf ihn in wenigen Sekunden mit FlipLens.</li></ul>',
      },
      {
        h2: 'Den genauen Artikel erkennen',
        html: '<ul><li>Such die Modellnummer auf dem Typenschild, im Batteriefach oder auf der Verpackung. Mach ein Foto davon.</li><li>Prüf Speichergröße, Generation und bei Objektiven den Anschluss.</li><li>Barcodes auf der Verpackung erkennen die genaue Variante am schnellsten.</li></ul>',
      },
      {
        h2: 'Testen, was geht',
        html: '<ul><li>Geht das Gerät an? Frag nach einer Steckdose oder nimm Powerbank und Kabel mit.</li><li>Displays: Pixelfehler, Einbrennen, Risse. Anschlüsse: Wackelige Ladebuchsen sind häufig.</li><li>Controller und Joy-Cons: auf Stick-Drift prüfen.</li><li>Kameras und Objektive: gegen das Licht durchs Objektiv schauen (Schleier, Pilz, Kratzer); prüfen, ob der Verschluss auslöst.</li><li>Handys und Tablets: wenn möglich den Akkuzustand in den Einstellungen prüfen.</li></ul>',
      },
      {
        h2: 'Prüfen, dass nichts gesperrt ist',
        html: '<p>Handys, Tablets, Laptops und Smartwatches können an das Konto des Vorbesitzers gebunden sein (zum Beispiel die Aktivierungssperre von Apple). Ein gesperrtes Gerät ist nur einen Bruchteil wert. Lass dir zeigen, dass es abgemeldet oder vor deinen Augen zurückgesetzt ist.</p>',
      },
      {
        h2: 'Vollständigkeit bringt Geld',
        html: '<p>Originalverpackung, Ladegerät, Kabel, Objektivdeckel und Anleitungen helfen, schneller und teurer zu verkaufen. Fehlende Ladegeräte und spezielle Kabel kosten dich beim Nachkauf Geld.</p>',
      },
      {
        h2: 'Nach den Zahlen entscheiden',
        html: '<p>Vergleich den Preis des Verkäufers mit dem Höchstpreis nach Gebühren und Versand. Liegt er darüber, handle ihn darauf herunter oder geh weiter. Siehe <a href="/de/guides/how-to-check-resale-value">Wiederverkaufswert prüfen</a>.</p>',
      },
    ],
    faq: [
      { q: 'Was sollte ich vor dem Kauf gebrauchter Elektronik zum Weiterverkauf prüfen?', a: 'Genaues Modell und Variante, ob das Gerät angeht und funktioniert, Zustand von Display und Anschlüssen, dass es nicht an ein fremdes Konto gebunden ist, welches Zubehör dabei ist und ob der Preis unter deinem Höchstpreis nach Gebühren und Versand liegt.' },
    ],
  },
  {
    path: '/vinted-listing-generator',
    kind: 'page',
    crumb: 'Vinted-Anzeigen-Generator',
    cta: LISTING_CTA_DE,
    title: 'Vinted-Anzeigen-Generator: Titel und Beschreibung aus einem Foto',
    description: `Fotografier alles, was du verkaufst, auch Kleidung, und bekomm Titel, Beschreibung und Hashtags für Vinted in deiner Sprache. ${PLANS.free.monthlyListings} Anzeigen pro Monat gratis.`,
    h1: 'Vinted-Anzeigen-Generator',
    lead: 'Fotografier den Artikel und bekomm Titel, Beschreibung und Hashtags, fertig zum Einfügen in Vinted. Funktioniert für Kleidung, Schuhe, Taschen, Wohnen, Spielzeug und Technik, in deiner Sprache.',
    sections: [
      {
        h2: "So funktioniert's",
        html: '<ol><li>Mach ein bis drei Fotos: Vorderseite, Rückseite und das Marken- oder Größenetikett funktionieren am besten.</li><li>Wähl den Zustand und ergänz, was Fotos nicht zeigen, etwa Größe, Material oder einen kleinen Makel.</li><li>Kopier Titel und Beschreibung, öffne Vinted und füg sie ein.</li></ol>',
      },
      {
        h2: 'Was geschrieben wird',
        html: '<p>Für Vinted: ein kurzer, natürlicher Titel (Marke, Artikel und ein wichtiges Detail), eine freundliche und ehrliche Beschreibung, ein Satz zum Zustand und ein paar passende Suchbegriffe und Hashtags. Aus demselben Foto kann auch eine eBay-Anzeige werden (Titel mit Suchbegriffen zuerst, strukturierte Beschreibung) oder eine Kleinanzeigen-Anzeige (direkt, mit dem üblichen Hinweis zum Privatverkauf).</p>',
      },
      {
        h2: 'Ehrlich von Anfang an',
        html: '<p>Der Generator beschreibt nur, was auf deinen Fotos zu sehen ist oder in deinen Angaben steht. Er erfindet keine Größe, kein Material, keine Marke und keine Maße. Fehlt etwas, wonach Käufer meist fragen, etwa Größe oder Maße, sagt er dir das, damit du es vor dem Einstellen ergänzen kannst.</p>',
      },
      {
        h2: 'Und der Preis?',
        html: '<p>FlipLens liest keine Vinted-Daten. Nach dem Schreiben verlinkt es ähnliche Artikel auf Vinted, damit du Preise mit einem Tipp vergleichen kannst. Für Elektronik, Spiele und Kameras kann FlipLens außerdem den <a href="/de/how-it-works">Wiederverkaufswert schätzen</a>, anhand von eBay-Angeboten in fünf EU-Ländern oder auf eBay.co.uk.</p>',
      },
      {
        h2: 'Tarife',
        html: `<p>Free: ${PLANS.free.monthlyListings} Anzeigen pro Monat. Pro (${deEur(PLANS.pro.priceMonthlyMinor)}/Monat): ${PLANS.pro.monthlyListings} Anzeigen und ${PLANS.pro.monthlyValuations} Preis-Checks. Reseller (${deEur(PLANS.reseller.priceMonthlyMinor)}/Monat): bis zu ${deNum(PLANS.reseller.monthlyListings)}. Siehe <a href="/de/pricing">Preise</a>.</p>`,
      },
    ],
    faq: [
      { q: 'Ist der Vinted-Anzeigen-Generator kostenlos?', a: `Ja, ${PLANS.free.monthlyListings} Anzeigen pro Monat sind nach der Anmeldung mit Google kostenlos. Pro enthält ${PLANS.pro.monthlyListings} pro Monat.` },
      { q: 'In welchen Sprachen schreibt er?', a: 'Englisch, Deutsch, Französisch, Italienisch, Spanisch, Niederländisch, Polnisch, Slowenisch, Kroatisch, Tschechisch, Portugiesisch und Schwedisch.' },
      { q: 'Stellt er die Anzeige für mich auf Vinted ein?', a: 'Nein. Du kopierst den Text und fügst ihn selbst in Vinted ein. FlipLens ist unabhängig und gehört nicht zu Vinted.' },
      { q: 'Werden meine Fotos gespeichert?', a: 'Nein. Fotos werden nur zum Schreiben der Anzeige verwendet und nicht gespeichert.' },
    ],
  },
  {
    path: '/guides/how-to-sell-on-vinted',
    kind: 'article',
    crumb: 'Auf Vinted verkaufen',
    parent: { path: '/guides', name: 'Ratgeber' },
    cta: LISTING_CTA_DE,
    title: 'Auf Vinted verkaufen: Gebühren, Anzeigen, die verkaufen, und Preise',
    description: 'Ein praktischer Ratgeber zum Verkaufen auf Vinted in Europa: wer die Gebühren zahlt, wie du Artikel fotografierst und beschreibst, wie du Preise setzt und wie du versendest.',
    h1: 'Auf Vinted verkaufen',
    lead: 'Vinted ist der größte Second-Hand-Marktplatz für Kleidung in Europa und funktioniert auch für kleine Elektronik und Wohnartikel. Klare Fotos, eine ehrliche Beschreibung und der richtige Preis erledigen den Großteil der Arbeit.',
    sections: [
      {
        h2: 'Wer die Gebühren zahlt',
        html: '<p>Verkäufer zahlen auf Vinted keine Verkaufsgebühr. Der Käufer zahlt eine Käuferschutzgebühr und den Versand zusätzlich zu deinem Preis, die Summe für ihn ist also höher als das, was du verlangst. Optionale bezahlte Hervorhebungen, etwa das Pushen eines Artikels, gibt es für Verkäufer. Gebühren können je nach Land unterschiedlich sein und sich ändern. Prüf deshalb die aktuellen Regeln im Hilfe-Center von Vinted.</p>',
      },
      {
        h2: 'Fotos, die angeklickt werden',
        html: '<ul><li>Nutz Tageslicht und einen ruhigen Hintergrund.</li><li>Zeig Vorderseite, Rückseite, Markenetikett und Größenetikett.</li><li>Fotografier Makel aus der Nähe: Käufer vertrauen Verkäufern, die sie zeigen.</li><li>Dein erstes Foto sehen die Leute in der Suche, also nimm das klarste.</li></ul>',
      },
      {
        h2: 'Titel und Beschreibung',
        html: '<p>Beginn den Titel mit Marke und Artikel, dann ein wichtiges Detail wie Größe oder Farbe: "Levi\'s 501 Jeans W32 L32, dunkelblau". In der Beschreibung nennst du die Größe und bei Kleidung die Maße (zum Beispiel Brustumfang und Länge), das Material laut Pflegeetikett, die Passform und den Zustand inklusive Makeln. Ergänz ein paar Begriffe, nach denen Leute suchen, etwa den Stil oder den Anlass.</p>',
      },
      {
        h2: 'Den Zustand ehrlich wählen',
        html: '<p>Vinted lässt dich einen Zustand wählen, von "Neu mit Etikett" bis "Zufriedenstellend". Einen besseren Zustand anzugeben, als der Artikel hat, ist ein häufiger Grund für Streit und Rücksendungen. Im Zweifel nimm den schlechteren und erklär es in der Beschreibung.</p>',
      },
      {
        h2: 'Preise',
        html: '<p>Such auf Vinted nach derselben Marke und demselben Artikel in ähnlichem Zustand und setz deinen Preis in diese Spanne. Viele Käufer machen Angebote, lass also etwas Luft. Bündelrabatte bringen Käufer dazu, mehrere Artikel in einem Paket zu nehmen, und sparen dir Wege zur Post.</p>',
      },
      {
        h2: 'Versand',
        html: '<p>Verpack Artikel sicher, versende innerhalb der Frist, die Vinted dir gibt, und heb den Einlieferungsbeleg auf, bis der Käufer die Bestellung bestätigt hat.</p>',
      },
      {
        h2: 'Anzeigen schneller schreiben',
        html: '<p>Der <a href="/de/vinted-listing-generator">FlipLens-Anzeigen-Generator</a> macht aus einem Foto Titel und Beschreibung für Vinted in deiner Sprache und sagt dir, wonach Käufer fragen werden, etwa Größe oder Maße.</p>',
      },
    ],
    faq: [
      { q: 'Zahlen Verkäufer auf Vinted Gebühren?', a: 'Keine Verkaufsgebühr. Der Käufer zahlt eine Käuferschutzgebühr und den Versand zusätzlich zum Preis. Optionale Hervorhebungen kosten extra.' },
      { q: 'Wie schreibe ich eine gute Vinted-Beschreibung?', a: 'Nenn Marke, Größe und Maße, Material, Passform und einen ehrlichen Zustand inklusive Makeln, dazu ein paar Begriffe, nach denen Käufer suchen.' },
    ],
  },
  {
    path: '/best-resale-value-apps',
    kind: 'article',
    crumb: 'Wiederverkaufswert prüfen: Methoden',
    title: 'Wiederverkaufswert in Europa prüfen: Apps und Methoden im Vergleich (2026)',
    description: 'Ein ehrlicher Vergleich, wie du herausfindest, was ein gebrauchter Artikel in Europa wert ist: FlipLens, verkaufte Artikel auf eBay, Suche auf Vinted und Kleinanzeigen, Google Lens und Ankaufsangebote.',
    h1: 'Wiederverkaufswert in Europa prüfen: Apps und Methoden im Vergleich',
    lead: 'Es gibt nicht die eine perfekte Quelle für Gebrauchtpreise. Jede Methode unten beantwortet eine etwas andere Frage. Hier siehst du, wofür sie jeweils gut ist, wo sie Schwächen hat und wann du sie nutzen solltest.',
    sections: [
      {
        h2: 'Auf einen Blick',
        html: '<table><thead><tr><th>Methode</th><th>Tempo</th><th>Daten</th><th>Verkaufs- oder Angebotspreise</th><th>Länder</th><th>Kosten</th></tr></thead><tbody><tr><td>FlipLens</td><td>Sekunden, per Foto, Barcode oder Modellname</td><td>Aktive eBay-Angebote, gefiltert und an den Zustand angepasst</td><td>Angebotspreise, nach unten korrigiert</td><td>Deutschland, Frankreich, Italien, Spanien, Niederlande gleichzeitig, oder Großbritannien</td><td>10 Checks pro Monat gratis, bezahlte Tarife für mehr</td></tr><tr><td>eBay-Filter „Verkaufte Artikel"</td><td>Ein paar Minuten pro Artikel</td><td>Abgeschlossene Verkäufe auf einer eBay-Seite</td><td>Verkaufspreise</td><td>Ein Land nach dem anderen</td><td>Kostenlos</td></tr><tr><td>Suche auf Vinted, Kleinanzeigen</td><td>Ein paar Minuten</td><td>Aktuelle Angebote in deiner Gegend</td><td>Angebotspreise</td><td>Ein Marktplatz, eine Region</td><td>Kostenlos</td></tr><tr><td>Google Lens, dann Marktplatz-Suche</td><td>Schnell erkannt, langsam bepreist</td><td>Bildtreffer, danach deine eigene Suche</td><td>Was du findest</td><td>Alle</td><td>Kostenlos</td></tr><tr><td>Ankaufs- und Trade-in-Seiten</td><td>Sofortangebot</td><td>Die Preisliste des Ankäufers</td><td>Ein Angebot, dir den Artikel abzukaufen</td><td>Unterschiedlich</td><td>Kostenlos</td></tr></tbody></table>',
      },
      {
        h2: 'FlipLens',
        html: '<p>FlipLens erkennt das genaue Modell per Foto, Barcode oder eingetipptem Namen, liest vergleichbare aktive eBay-Angebote aus fünf EU-Ländern oder von eBay.co.uk, sortiert andere Varianten, Bundles und defekte Artikel aus, passt an den Zustand an und zeigt Wiederverkaufsspanne, Gewinn nach Gebühren und Versand und den Höchstpreis. <strong>Gut für:</strong> schnelle Kaufentscheidungen auf dem Flohmarkt und bei Kleinanzeigen, wenn du nicht jeden Artikel von Hand recherchieren willst. <strong>Grenzen:</strong> FlipLens arbeitet mit Angebotspreisen, nicht mit bestätigten Verkaufspreisen; es deckt Elektronik, Gaming, Kameras und Werkzeug ab, keine Mode; bei zu wenigen Vergleichsangeboten sagt es das, statt zu schätzen. Siehe <a href="/de/how-it-works">So funktioniert\'s</a>.</p>',
      },
      {
        h2: 'eBay-Suche mit dem Filter „Verkaufte Artikel"',
        html: '<p>Auf eBay kannst du die Suche auf tatsächlich verkaufte Artikel filtern. <strong>Besser als FlipLens bei:</strong> echten Endpreisen statt Angebotspreisen. <strong>Nachteile:</strong> du prüfst eine eBay-Seite nach der anderen, musst andere Generationen, Bundles und defekte Artikel selbst aussortieren und Gebühren und Versand selbst abziehen, um deinen Gewinn zu kennen. Lohnt sich bei teuren Artikeln, bevor du zuschlägst.</p>',
      },
      {
        h2: 'Suche auf Vinted oder Kleinanzeigen',
        html: '<p>Die Suche auf dem Marktplatz, auf dem du verkaufen willst, zeigt deine Konkurrenz. <strong>Gut für:</strong> lokale Preise und Artikel, die vor allem über Kleinanzeigen laufen. <strong>Nachteile:</strong> du siehst nur Angebotspreise, und Anzeigen, die wochenlang nicht verkauft werden, verzerren das Bild nach oben. FlipLens verlinkt diese Suchen in jedem Ergebnis, damit du mit einem Tipp vergleichen kannst.</p>',
      },
      {
        h2: 'Google Lens, um einen unbekannten Artikel zu erkennen',
        html: '<p>Wenn du nicht weißt, was ein Artikel ist, findet eine Bildersuche oft Name oder Modell. <strong>Gut für:</strong> ungewöhnliche Artikel, Vintage und alles ohne lesbares Etikett. <strong>Nachteile:</strong> erkennen ist nicht bepreisen; du musst danach trotzdem auf Marktplätzen suchen und Zustand und Varianten selbst beurteilen.</p>',
      },
      {
        h2: 'Ankaufs- und Trade-in-Angebote',
        html: '<p>Manche Läden und Websites machen dir ein Sofortangebot für dein gebrauchtes Handy, deine Konsole oder Kamera. <strong>Gut für:</strong> schnell und ohne Aufwand verkaufen. <strong>Nachteile:</strong> das Angebot ist das, was der Ankäufer zahlen will, um selbst weiterzuverkaufen, also meist deutlich unter dem, was du privat bekommst. Es ist eine Untergrenze, kein Wiederverkaufswert.</p>',
      },
      {
        h2: 'Wann was passt',
        html: '<ul><li><strong>Am Stand, Sekunden zum Entscheiden:</strong> FlipLens.</li><li><strong>Ein teurer Artikel vor dem Kauf:</strong> erst FlipLens, dann zur Bestätigung der eBay-Filter für verkaufte Artikel.</li><li><strong>Deine eigene Anzeige bepreisen:</strong> schau, was gerade auf deinem Marktplatz angeboten wird.</li><li><strong>Keine Ahnung, was es ist:</strong> zuerst Google Lens.</li><li><strong>Es soll einfach weg:</strong> ein Ankaufsangebot, im Wissen, dass es die niedrigste Zahl ist.</li></ul>',
      },
    ],
    faq: [
      { q: 'Wie finde ich den Wiederverkaufswert am genauesten heraus?', a: 'Mit aktuellen Verkaufspreisen für genau dieses Modell im gleichen Zustand, abzüglich Gebühren und Versand. Der eBay-Filter für verkaufte Artikel zeigt sie für ein Land nach dem anderen; FlipLens liefert eine schnelle Schätzung aus aktiven Angeboten in fünf EU-Ländern oder auf eBay.co.uk.' },
      { q: 'Warum sind Ankaufsangebote so niedrig?', a: 'Der Ankäufer muss den Artikel weiterverkaufen und daran verdienen, deshalb liegt das Angebot unter dem privaten Wiederverkaufspreis.' },
      { q: 'Kann ich den Wiederverkaufswert kostenlos prüfen?', a: 'Ja. Marktplatz-Suchen und der eBay-Filter sind kostenlos, und FlipLens enthält 10 kostenlose Checks pro Monat.' },
    ],
  },
  {
    path: '/guides/how-much-is-my-console-worth',
    kind: 'article',
    crumb: 'Was ist meine Konsole wert',
    parent: { path: '/guides', name: 'Ratgeber' },
    title: 'Was ist meine Konsole wert? Konsolen, Handhelds, Controller und Spiele',
    description: 'Was den Wiederverkaufswert gebrauchter Konsolen, Handhelds, Controller und Spiele in Europa bestimmt, welche Fehler Geld kosten und wie du den Preis in Sekunden prüfst.',
    h1: 'Was ist meine Konsole wert?',
    lead: 'Gaming-Hardware lässt sich gut weiterverkaufen, aber zwei Konsolen, die gleich aussehen, können ganz unterschiedlich viel wert sein. Auf diese Details kommt es an.',
    sections: [
      {
        h2: 'Was den Preis bestimmt',
        html: '<ul><li><strong>Genaues Modell und Revision:</strong> zum Beispiel Standardmodell gegen OLED- oder Slim-Version, Disc- gegen Digital-Edition. Die Modellnummer auf der Unter- oder Rückseite verrät es dir.</li><li><strong>Speicher:</strong> mehr interner Speicher bringt meist mehr.</li><li><strong>Zustand:</strong> Kratzer auf dem Display, vergilbtes Plastik, laute Lüfter und Stick-Drift bei Controllern drücken den Preis.</li><li><strong>Vollständigkeit:</strong> Originalkarton, Controller, Dock, Kabel und Netzteil. Eine Konsole ohne Netzteil verkauft sich schwerer.</li><li><strong>Konto und Sperren:</strong> eine Konsole, die noch mit dem Konto einer anderen Person verbunden oder von Online-Diensten gesperrt ist, ist viel weniger wert.</li></ul>',
      },
      {
        h2: 'Controller und Spiele',
        html: '<p>Bei Controllern prüfen Käufer Stick-Drift und abgenutzte Tasten; Original-Controller verkaufen sich besser als Drittanbieter. Bei Spielen zählt die Edition (Standard, Collector\'s, Region) und ob Hülle, Anleitung und eventuelle Codes vollständig sind. Versiegelte Spiele und komplette Retro-Spiele im Originalkarton sind ein eigener Markt: vergleiche Gleiches mit Gleichem.</p>',
      },
      {
        h2: 'Häufige Fehler',
        html: '<ul><li>Den eigenen Artikel mit einem Bundle mit zusätzlichen Spielen oder Controllern vergleichen.</li><li>Den höchsten Angebotspreis für den Wert halten.</li><li>Den Versand vergessen: Konsolen sind schwer und sperrig.</li><li>Einen Handheld kaufen, ohne Display und Tasten zu testen.</li></ul>',
      },
      {
        h2: 'Kurze Checkliste',
        html: '<ul><li>Modellnummer und Speicher notiert.</li><li>Startet, liest Discs (falls Laufwerk vorhanden), Controller verbinden sich.</li><li>Aus allen Konten abgemeldet oder auf Werkseinstellungen zurückgesetzt.</li><li>Netzteil und Kabel dabei.</li><li>Preis mit dem gleichen Modell im gleichen Zustand verglichen.</li></ul>',
      },
      {
        h2: 'Wo verkaufen und wie schnell prüfen',
        html: '<p>Konsolen verkaufen sich gut auf eBay und lokal; siehe <a href="/de/guides/where-to-sell-used-electronics-europe">wo du gebrauchte Elektronik in Europa verkaufst</a>. Um eine Konsole in Sekunden zu prüfen, scann den Barcode oder tipp das Modell in FlipLens ein: es vergleicht Angebote auf eBay in fünf EU-Ländern oder auf eBay.co.uk und zeigt dir den Höchstpreis. <a href="/de/how-it-works">So funktioniert\'s</a>.</p>',
      },
    ],
    faq: [
      { q: 'Wie finde ich heraus, welches Konsolenmodell ich habe?', a: 'Such die Modellnummer auf der Unter- oder Rückseite der Konsole oder in den Systemeinstellungen. Sie verrät die genaue Version und oft den Speicher.' },
      { q: 'Ist der Originalkarton wichtig?', a: 'Ja. Eine komplette Konsole mit Karton, Controllern und Kabeln verkauft sich meist schneller und teurer als die Konsole allein.' },
    ],
  },
  {
    path: '/guides/resale-value-cameras-lenses',
    kind: 'article',
    crumb: 'Kameras und Objektive',
    parent: { path: '/guides', name: 'Ratgeber' },
    title: 'Wiederverkaufswert gebrauchter Kameras und Objektive: was du vor dem Kauf prüfst',
    description: 'Was den Wiederverkaufswert gebrauchter Kameragehäuse und Objektive in Europa bestimmt: Bajonett, Auslösungen, Zustand von Sensor und Glas, Vollständigkeit und Region, plus Checkliste.',
    h1: 'Wiederverkaufswert gebrauchter Kameras und Objektive',
    lead: 'Fotoausrüstung behält ihren Wert besser als die meiste Elektronik, aber ein einziges Problem wie Pilz im Objektiv macht einen Artikel fast wertlos. Prüf diese Punkte, bevor du zahlst.',
    sections: [
      {
        h2: 'Was den Preis eines Kameragehäuses bestimmt',
        html: '<ul><li><strong>Genaues Modell:</strong> Generationen derselben Serie unterscheiden sich stark im Wert.</li><li><strong>Auslösungen:</strong> wie viele Fotos die Kamera schon gemacht hat. Viele Auslösungen drücken den Wert; bei vielen Kameras lässt sich die Zahl aus den Dateien oder dem Menü auslesen.</li><li><strong>Sensor und Display:</strong> Kratzer, tote Pixel und Staub, der sich nicht entfernen lässt.</li><li><strong>Vollständigkeit:</strong> Akku, Ladegerät, Gurt, Deckel und Karton.</li><li><strong>Region und Sprache:</strong> manche Importmodelle haben andere Menüs oder Garantiebedingungen.</li></ul>',
      },
      {
        h2: 'Was den Preis eines Objektivs bestimmt',
        html: '<ul><li><strong>Bajonett:</strong> dieselbe Brennweite gibt es für verschiedene Bajonette (zum Beispiel Canon RF und EF, Sony E/FE, Nikon Z und F). Vergleich nur gleiches Bajonett.</li><li><strong>Optischer Zustand:</strong> Pilz, Schleier, Linsentrennung und tiefe Kratzer senken den Wert stark. Leuchte von hinten mit einer Lampe durchs Objektiv.</li><li><strong>Mechanik:</strong> Autofokus funktioniert, Zoom- und Fokusring laufen sauber, Blendenlamellen sind sauber und trocken.</li><li><strong>Version:</strong> viele Objektive gibt es in mehreren Versionen (zum Beispiel mit oder ohne Bildstabilisator).</li></ul>',
      },
      {
        h2: 'Häufige Fehler',
        html: '<ul><li>Ein Objektiv mit gleicher Brennweite, aber anderem Bajonett oder anderer Version vergleichen.</li><li>Den Autofokus nicht an einem Gehäuse testen.</li><li>Pilz übersehen, weil das Objektiv nicht gegen Licht geprüft wurde.</li><li>Die Auslösungen bei einem sauber aussehenden Gehäuse ignorieren.</li></ul>',
      },
      {
        h2: 'Kurze Checkliste',
        html: '<ul><li>Modell, Bajonett und Version notiert.</li><li>Objektiv gegen Licht auf Pilz und Schleier geprüft.</li><li>Gehäuse startet, macht ein Foto, Auslösungen wenn möglich bekannt.</li><li>Akku und Ladegerät dabei.</li></ul>',
      },
      {
        h2: 'Wo verkaufen und wie schnell prüfen',
        html: '<p>Kameras und Objektive verkaufen sich europaweit gut auf eBay; siehe <a href="/de/guides/where-to-sell-used-electronics-europe">wo du gebrauchte Elektronik in Europa verkaufst</a>. FlipLens liest Modell und Bajonett aus einem Foto des Etiketts oder des Objektivtubus und vergleicht Angebote auf eBay in fünf EU-Ländern oder auf eBay.co.uk. <a href="/de/how-it-works">So funktioniert\'s</a>.</p>',
      },
    ],
    faq: [
      { q: 'Wie prüfe ich ein gebrauchtes Objektiv auf Pilz?', a: 'Leuchte mit einer hellen Lampe von hinten durchs Objektiv und achte auf fadenartige Muster, Flecken oder einen milchigen Schleier im Glas.' },
      { q: 'Spielen die Auslösungen beim Wiederverkauf eine Rolle?', a: 'Ja. Käufer vergleichen sie mit der erwarteten Lebensdauer des Verschlusses für dieses Modell, wenige Auslösungen helfen also dem Preis.' },
    ],
  },
  {
    path: '/guides/resale-value-headphones',
    kind: 'article',
    crumb: 'Kopfhörer',
    parent: { path: '/guides', name: 'Ratgeber' },
    title: 'Wiederverkaufswert gebrauchter Kopfhörer und Earbuds: Generationen, Akku und Hygiene',
    description: 'Was den Wiederverkaufswert gebrauchter Kopfhörer und Earbuds in Europa bestimmt: genaue Generation, Akkuverschleiß, Ohrpolster, Vollständigkeit und Hygiene, plus Checkliste.',
    h1: 'Wiederverkaufswert gebrauchter Kopfhörer und Earbuds',
    lead: 'Beliebte Kopfhörer verkaufen sich schnell weiter, aber Generationen sehen sich ähnlich und Akkus verschleißen. Darauf achten Käufer.',
    sections: [
      {
        h2: 'Was den Preis bestimmt',
        html: '<ul><li><strong>Genaue Generation:</strong> Modelle derselben Serie, etwa Sony WH-1000XM4 und WH-1000XM5 oder verschiedene AirPods-Generationen, erzielen unterschiedliche Preise. Prüf die Modellnummer am Bügel, am Case oder in den Einstellungen.</li><li><strong>Akku:</strong> kabellose Kopfhörer und Earbuds verlieren mit der Zeit Kapazität; eine deutlich kürzere Laufzeit senkt den Wert.</li><li><strong>Ohrpolster und Aufsätze:</strong> abgenutzte oder bröselnde Polster schrecken Käufer ab, lassen sich aber oft ersetzen.</li><li><strong>Vollständigkeit:</strong> Case, Kabel, Adapter und Karton.</li><li><strong>Echtheit:</strong> beliebte Earbuds werden oft gefälscht; Seriennummern und das Kopplungsverhalten helfen bei der Prüfung.</li></ul>',
      },
      {
        h2: 'Hygiene und Earbuds',
        html: '<p>Viele Käufer sind bei gebrauchten In-Ear-Produkten vorsichtig. Reinige sie gründlich, ersetze wenn möglich die Silikonaufsätze und schreib das in die Anzeige. Ein fehlender Ohrhörer oder ein fehlendes Ladecase macht ein Set viel schwerer verkäuflich.</p>',
      },
      {
        h2: 'Häufige Fehler',
        html: '<ul><li>Zwei fast gleich aussehende Generationen verwechseln.</li><li>Geräuschunterdrückung, Mikrofone und beide Seiten nicht testen.</li><li>Earbuds kaufen, die noch mit dem Konto einer anderen Person verbunden sind.</li></ul>',
      },
      {
        h2: 'Kurze Checkliste',
        html: '<ul><li>Modellnummer und Generation bestätigt.</li><li>Beide Seiten funktionieren, Geräuschunterdrückung und Mikrofon getestet.</li><li>Akku hält die Ladung.</li><li>Case, Kabel und Aufsätze dabei.</li><li>Vom Konto des Vorbesitzers entfernt.</li></ul>',
      },
      {
        h2: 'Wo verkaufen und wie schnell prüfen',
        html: '<p>Kopfhörer verkaufen sich gut auf eBay und Vinted; siehe <a href="/de/guides/where-to-sell-used-electronics-europe">wo du gebrauchte Elektronik in Europa verkaufst</a>. In FlipLens reicht ein Foto des Etiketts oder der Barcode auf dem Karton, um die Generation zu erkennen und Preise auf eBay in fünf EU-Ländern oder auf eBay.co.uk zu vergleichen. <a href="/de/how-it-works">So funktioniert\'s</a>.</p>',
      },
    ],
    faq: [
      { q: 'Wie unterscheide ich Kopfhörer-Generationen?', a: 'Lies die Modellnummer am Bügel, am Case oder auf dem Karton ab, oder in der Begleit-App bzw. den Bluetooth-Einstellungen.' },
      { q: 'Kann ich gebrauchte Earbuds verkaufen?', a: 'Ja, aber reinige sie, ersetze wenn möglich die Aufsätze und beschreib den Zustand ehrlich. Komplette Sets mit Ladecase verkaufen sich am besten.' },
    ],
  },
  {
    path: '/guides/sell-used-phone-europe',
    kind: 'article',
    crumb: 'Gebrauchtes Handy verkaufen',
    parent: { path: '/guides', name: 'Ratgeber' },
    title: 'Gebrauchtes Handy in Europa verkaufen: was den Preis bestimmt und was du prüfst',
    description: 'Was den Wiederverkaufswert eines gebrauchten Smartphones in Europa bestimmt: Modell, Speicher, Akkuzustand, Konto- und Netzsperren, Zustand, plus Checkliste für Kauf und Verkauf.',
    h1: 'Gebrauchtes Handy in Europa verkaufen',
    lead: 'Handys sind die häufigste gebrauchte Elektronik und am leichtesten falsch eingeschätzt. Ein gesperrtes Handy oder der falsche Speicher macht aus einem guten Deal schnell einen Verlust.',
    sections: [
      {
        h2: 'Was den Preis bestimmt',
        html: '<ul><li><strong>Genaues Modell:</strong> Standard-, Plus-, Pro- und Max-Versionen unterscheiden sich stark im Wert.</li><li><strong>Speicher:</strong> mehr Speicher bringt mehr. Prüf ihn in den Einstellungen, nicht nur auf dem Karton.</li><li><strong>Akkuzustand:</strong> viele Handys zeigen den Akkuzustand in den Einstellungen; ein schwacher Akku senkt den Preis.</li><li><strong>Zustand:</strong> Kratzer oder Risse im Display, Rückglas, Dellen im Rahmen, Kameralinsen, Tasten und Anschlüsse.</li><li><strong>Vollständigkeit:</strong> Karton und Kabel helfen ein wenig; entscheidend ist das Handy selbst.</li></ul>',
      },
      {
        h2: 'Kontosperren und Netzsperren',
        html: '<p>Ein Handy, das noch mit dem Konto des Vorbesitzers verbunden ist (zum Beispiel Apples Aktivierungssperre oder ein Google-Konto nach dem Zurücksetzen), kann ein neuer Besitzer nicht einrichten; es ist nur einen Bruchteil wert. Lass den Verkäufer das Konto vor deinen Augen entfernen und das Handy zurücksetzen. Prüf auch, ob das Handy an ein Mobilfunknetz gebunden ist: entsperrte Handys finden mehr Käufer.</p>',
      },
      {
        h2: 'Häufige Fehler',
        html: '<ul><li>Ein Handy kaufen, das noch in einem Konto angemeldet ist.</li><li>Preise einer anderen Speichergröße oder Version vergleichen.</li><li>Nicht prüfen, ob das Display ersetzt oder nicht original ist.</li><li>Den Akkuzustand ignorieren.</li></ul>',
      },
      {
        h2: 'Kurze Checkliste',
        html: '<ul><li>Modell und Speicher in den Einstellungen bestätigt.</li><li>Aus allen Konten abgemeldet und auf Werkseinstellungen zurückgesetzt.</li><li>Nicht an ein Netz gebunden.</li><li>Akkuzustand geprüft.</li><li>Display, Kameras, Lautsprecher, Mikrofon und Ladeanschluss getestet.</li></ul>',
      },
      {
        h2: 'Wo verkaufen und wie schnell prüfen',
        html: '<p>Handys verkaufen sich auf eBay, Kleinanzeigen und Vinted; siehe <a href="/de/guides/where-to-sell-used-electronics-europe">wo du gebrauchte Elektronik in Europa verkaufst</a>. FlipLens erkennt das Modell per Foto oder Barcode, du stellst den Speicher ein und es vergleicht Angebote auf eBay in fünf EU-Ländern oder auf eBay.co.uk. <a href="/de/how-it-works">So funktioniert\'s</a>.</p>',
      },
    ],
    faq: [
      { q: 'Was prüfe ich vor dem Kauf eines gebrauchten Handys?', a: 'Dass es aus allen Konten abgemeldet und zurückgesetzt ist, nicht an ein Netz gebunden ist, den erwarteten Speicher und einen guten Akku hat und Display, Kameras und Ladeanschluss funktionieren.' },
      { q: 'Ändert der Speicher den Wiederverkaufswert?', a: 'Ja. Dasselbe Modell mit mehr Speicher bringt meist mehr, vergleich also immer die gleiche Speichergröße.' },
    ],
  },
  {
    path: '/guides/resale-value-branded-clothes',
    kind: 'article',
    crumb: 'Wiederverkaufswert von Kleidung',
    parent: { path: '/guides', name: 'Ratgeber' },
    title: 'Was ist meine Kleidung wert? Wiederverkaufswert von Markenkleidung',
    description: 'Was den Wiederverkaufswert gebrauchter Jacken, Jeans, Kleider, Hoodies und Taschen bestimmt: Marke, Zustand, Größe, Saison und Vollständigkeit.',
    h1: 'Was ist meine Kleidung wert?',
    lead: 'Gebrauchte Kleidung verkauft sich jeden Tag auf Vinted und eBay, aber die Preise reichen von ein paar Euro bis weit über hundert. Die Marke auf dem Etikett entscheidet das meiste, der Rest hängt an ein paar Details, die Käufer immer prüfen.',
    sections: [
      {
        h2: 'Was den Preis bestimmt',
        html: '<ul><li><strong>Marke:</strong> mit Abstand der wichtigste Faktor. Premium- und Outdoor-Marken behalten viel mehr von ihrem Wert als Fast Fashion.</li><li><strong>Art des Artikels:</strong> eine Winterjacke oder eine Ledertasche bringt mehr als ein T-Shirt derselben Marke.</li><li><strong>Bekannte Linien und Modelle:</strong> Klassiker wie die Levi\'s 501 oder die The North Face Nuptse haben andere Preise als die Basics der Marke, vergleich also Gleiches mit Gleichem.</li><li><strong>Zustand:</strong> neu mit Etikett, neu ohne Etikett, sehr gut, gut oder zufriedenstellend. Flecken, Pilling, Löcher und ausgeblichene Farben drücken den Preis.</li><li><strong>Größe:</strong> gängige Größen verkaufen sich schneller; sehr große und sehr kleine Größen brauchen meist länger.</li><li><strong>Saison:</strong> Mäntel und Stiefel laufen im Herbst und Winter am besten, leichte Kleider und Shorts im Frühling und Sommer.</li><li><strong>Vollständigkeit:</strong> eine abnehmbare Kapuze, ein Gürtel oder der Staubbeutel einer Tasche helfen dem Preis.</li></ul>',
      },
      {
        h2: 'Fast Fashion gegen Premium-Marken',
        html: '<p>Fast-Fashion-Marken wie Zara, H&amp;M, Bershka und Pull&amp;Bear bringen gebraucht meist ein paar Euro bis etwa 15 bis 20, auch in gutem Zustand. Premium-, Designer- und Outdoor-Marken sind deutlich mehr wert, und genau deshalb werden sie auch gefälscht. Heb bei wertvollen Stücken Echtheitsetiketten und Kaufbeleg auf, wenn du sie hast, und fotografier die Etiketten gut lesbar: Käufer fragen danach.</p>',
      },
      {
        h2: 'Wo du Kleidung verkaufst',
        html: '<ul><li><strong>Vinted:</strong> der wichtigste Marktplatz für Kleidung in Europa. In den meisten Ländern zahlen Verkäufer keine Verkaufsgebühr; Versand und Käuferschutz zahlt der Käufer zusätzlich. Siehe <a href="/de/guides/how-to-sell-on-vinted">auf Vinted verkaufen</a>.</li><li><strong>eBay:</strong> private Verkäufer in Deutschland und Großbritannien zahlen keine Verkaufsgebühren, den Versand zahlt aber meist der Verkäufer. Gut für Premium-Marken und Käufer in anderen Ländern.</li><li><strong>Lokal:</strong> Kleinanzeigen und Flohmärkte, ganz ohne Versand, aber mit weniger Käufern pro Artikel.</li></ul>',
      },
      {
        h2: 'So schätzt FlipLens Kleidungspreise',
        html: '<p>Fotografier den Artikel und sein Markenetikett. FlipLens liest Marke und Art (Damen, Herren oder Kinder), vergleicht Angebote derselben Marke und Art in derselben eBay-Kategorie, auf eBay in fünf EU-Ländern oder auf eBay.co.uk, und korrigiert die Angebotspreise nach unten. Standardmäßig bewertet es Kleidung für Vinted, zieht also den üblichen Versand ab, weil ihn dort der Käufer zahlt, und zeigt eBay direkt daneben. Artikel ohne erkennbare Marke werden nicht bepreist.</p><p>Die Schätzung ist gröber als bei Elektronik: FlipLens vergleicht Marke und Art, nicht das genaue Stück. Nimm sie als Orientierung für die Preisspanne und schau dir ähnliche Angebote an, bevor du deinen Endpreis setzt. Siehe <a href="/de/guides/how-to-check-resale-value">Wiederverkaufswert prüfen</a>.</p>',
      },
      {
        h2: 'Vom Foto zur Vinted-Anzeige',
        html: '<p>Wenn du die Spanne kennst, schreibt dir FlipLens aus demselben Foto Titel und Beschreibung für Vinted, mit dem <a href="/de/vinted-listing-generator">Vinted-Anzeigen-Generator</a>. Ergänz die Maße und eventuelle Makel, und die Anzeige kann online gehen.</p>',
      },
    ],
    faq: [
      { q: 'Welche Kleidungsmarken lassen sich am besten weiterverkaufen?', a: 'Premium-, Designer- und Outdoor-Marken behalten viel mehr Wert als Fast Fashion. Fast-Fashion-Artikel von Marken wie Zara oder H&M bringen meist ein paar Euro bis etwa 15 bis 20.' },
      { q: 'Kann FlipLens Kleidung ohne Marke bepreisen?', a: 'Nein. FlipLens vergleicht Angebote derselben Marke und Art, Artikel ohne erkennbare Marke werden deshalb nicht bepreist.' },
      { q: 'Soll ich Kleidung auf Vinted oder eBay verkaufen?', a: 'Für Kleidung ist Vinted meist die erste Wahl, weil Verkäufer in den meisten Ländern keine Verkaufsgebühr zahlen und der Käufer den Versand übernimmt. Bei Premium-Marken lohnt der Vergleich mit eBay. FlipLens zeigt beides nebeneinander.' },
    ],
  },
  {
    path: '/guides/sneaker-resale-value',
    kind: 'article',
    crumb: 'Wiederverkaufswert von Sneakern',
    parent: { path: '/guides', name: 'Ratgeber' },
    title: 'Sneaker verkaufen: Was sind meine Sneaker noch wert?',
    description: 'Was den Wiederverkaufswert gebrauchter Sneaker bestimmt: Modell, Größe, Zustand, Originalkarton und Echtheit, plus wo du sie in Europa und UK verkaufst.',
    h1: 'Was sind meine Sneaker noch wert?',
    lead: 'Sneaker gehören zu den Schuhen, die sich am leichtesten weiterverkaufen lassen, aber zwei Paare derselben Marke können ganz unterschiedlich viel wert sein. Modell, Größe und Zustand entscheiden den Großteil des Preises.',
    sections: [
      {
        h2: 'Was den Preis bestimmt',
        html: '<ul><li><strong>Marke und Modell:</strong> bekannte Modelle wie der Nike Air Force 1 oder der Adidas Samba haben andere Preise als die einfachen Sneaker einer Marke. Vergleich immer dasselbe Modell.</li><li><strong>Größe:</strong> gängige Größen verkaufen sich am schnellsten, etwa EU 40 bis 44 bei Herren und EU 37 bis 39 bei Damen. Sehr kleine oder sehr große Größen brauchen länger.</li><li><strong>Zustand:</strong> neu mit Etikett, neu ohne Etikett, sehr gut, gut oder zufriedenstellend. Käufer achten auf Knicke, abgelaufene Sohlen, vergilbte Zwischensohlen und das Innenfutter.</li><li><strong>Karton und Extras:</strong> der Originalkarton und Ersatzschnürsenkel helfen, vor allem bei gefragten Modellen.</li></ul>',
      },
      {
        h2: 'Echtheit',
        html: '<p>Beliebte Sneaker werden oft gefälscht, deshalb sind Käufer vorsichtig. Fotografier das Größenetikett im Schuh, das Etikett auf dem Karton und einen Kaufbeleg, wenn du einen hast. Klare, ehrliche Fotos verkaufen schneller als eine Anzeige, bei der Käufer raten müssen.</p>',
      },
      {
        h2: 'Reinigen und fotografieren',
        html: '<ul><li>Reinige Obermaterial und Sohlen und wasch oder ersetze die Schnürsenkel.</li><li>Fotografier beide Schuhe von der Seite, von vorn, von hinten, die Sohlen und das Größenetikett.</li><li>Zeig Gebrauchsspuren und Makel aus der Nähe.</li><li>Nutz Tageslicht und einen ruhigen Hintergrund.</li></ul>',
      },
      {
        h2: 'Wo du Sneaker verkaufst',
        html: '<ul><li><strong>Vinted:</strong> in den meisten Ländern Europas keine Verkaufsgebühr für Verkäufer; Versand und Käuferschutz zahlt der Käufer. Siehe <a href="/de/guides/how-to-sell-on-vinted">auf Vinted verkaufen</a>.</li><li><strong>eBay:</strong> private Verkäufer in Deutschland und Großbritannien zahlen keine Verkaufsgebühren, den Versand zahlt aber meist der Verkäufer.</li><li><strong>Lokal:</strong> Kleinanzeigen und Flohmärkte, wo Käufer die Schuhe anprobieren können.</li></ul>',
      },
      {
        h2: 'Preis mit FlipLens prüfen',
        html: '<p>Fotografier die Sneaker und das Größenetikett. FlipLens liest Marke und Art, vergleicht Angebote derselben Marke und Art in derselben eBay-Kategorie auf eBay in fünf EU-Ländern oder auf eBay.co.uk, korrigiert die Angebotspreise nach unten und bewertet standardmäßig für Vinted, mit eBay direkt daneben. Es vergleicht Marke und Art, nicht das genaue Paar, nimm das Ergebnis also als grobe Spanne. Danach schreibt es aus demselben Foto die Anzeige, mit dem <a href="/de/vinted-listing-generator">Vinted-Anzeigen-Generator</a>. Siehe auch <a href="/de/guides/how-to-check-resale-value">Wiederverkaufswert prüfen</a>.</p>',
      },
    ],
    faq: [
      { q: 'Welche Sneaker-Größen verkaufen sich am schnellsten?', a: 'Gängige Größen, etwa EU 40 bis 44 bei Herren und EU 37 bis 39 bei Damen, verkaufen sich meist am schnellsten. Sehr kleine und sehr große Größen brauchen länger.' },
      { q: 'Ist der Originalkarton bei Sneakern wichtig?', a: 'Ja. Der Originalkarton schafft Vertrauen und hilft meist dem Preis, vor allem bei gefragten Modellen.' },
      { q: 'Wie genau ist die FlipLens-Schätzung bei Sneakern?', a: 'Es ist eine grobe Spanne. FlipLens vergleicht Angebote derselben Marke und Art, nicht genaues Modell und Größe, schau dir also ähnliche Angebote an, bevor du deinen Endpreis setzt.' },
    ],
  },
  {
    path: '/guides/lego-set-value',
    kind: 'article',
    crumb: 'Wert von LEGO-Sets',
    parent: { path: '/guides', name: 'Ratgeber' },
    title: 'Was ist mein LEGO-Set wert? Wiederverkaufswert prüfen',
    description: 'Was den Wert eines gebrauchten LEGO-Sets bestimmt: Setnummer, Zustand, Vollständigkeit, Minifiguren und ob das Set ausläuft, plus wo du es verkaufst.',
    h1: 'Was ist mein LEGO-Set wert?',
    lead: 'LEGO hält seinen Wert besser als die meisten Spielsachen, aber zwei Kartons desselben Sets können ganz unterschiedlich viel bringen. Die Setnummer sagt dir genau, was du hast; Zustand und Vollständigkeit entscheiden den Preis.',
    sections: [
      {
        h2: 'Finde die Setnummer',
        html: '<p>Jedes LEGO-Set hat eine Setnummer mit 4 bis 6 Ziffern. Du findest sie auf dem Karton, vorn auf der Bauanleitung und im LEGO-Katalog. Die Setnummer bestimmt das genaue Set, vergleich also immer Angebote mit dieser Nummer, nicht nur Thema oder Namen.</p><p>Kein Karton und keine Anleitung? Such im Katalog nach Thema und ein paar auffälligen Teilen oder Minifiguren, bis du das passende Set findest.</p>',
      },
      {
        h2: 'Zustand und Vollständigkeit',
        html: '<ul><li><strong>Neu, versiegelt:</strong> originalverpackt (OVP) und werkseitig verschlossen. Meist der höchste Preis.</li><li><strong>Neu, geöffnet:</strong> Karton offen, Tüten noch verschlossen oder unbenutzt.</li><li><strong>Gebraucht, vollständig:</strong> alle Teile, die Bauanleitung und alle Minifiguren.</li><li><strong>Gebraucht ohne Karton:</strong> vollständiges Set, aber ohne Karton. Weniger wert als mit Karton.</li><li><strong>Unvollständig:</strong> es fehlen Teile, Minifiguren oder die Anleitung. Fehlende Minifiguren und Anleitungen drücken den Wert stark.</li></ul><p>Um die Vollständigkeit zu prüfen, such die Teileliste zur Setnummer und hak Teile und Minifiguren ab. Schreib in deiner Anzeige klar, was dabei ist.</p>',
      },
      {
        h2: 'Ausgelaufene Sets, aktuelle Sets, Steine nach Kilo und Kopien',
        html: '<ul><li><strong>Ausgelaufene Sets:</strong> sobald LEGO ein Set nicht mehr verkauft, steigt sein Wert oft, vor allem versiegelt oder vollständig.</li><li><strong>Aktuelle Sets:</strong> noch im Handel erhältlich, dein gebrauchtes Set konkurriert also mit Rabatten im Laden und bringt oft weniger als gedacht.</li><li><strong>Steine nach Kilo:</strong> lose, gemischte Steine werden nach Gewicht verkauft. Das ist ein eigener Markt, getrennt von kompletten Sets.</li><li><strong>Kopien:</strong> kompatible Steine anderer Hersteller, etwa Lepin, oder Angebote mit dem Hinweis "kompatibel" sind kein LEGO und viel weniger wert. Achte auf das LEGO-Logo auf den Noppen.</li></ul>',
      },
      {
        h2: 'Wo du LEGO verkaufst',
        html: '<ul><li><strong>eBay:</strong> die größte Reichweite für komplette und versiegelte Sets. Private Verkäufer in Deutschland und Großbritannien zahlen keine Verkaufsgebühren, den Versand zahlt aber meist der Verkäufer.</li><li><strong>Lokal:</strong> Kleinanzeigen und Flohmärkte, gut für große Sets und Steine nach Kilo, ganz ohne Versand.</li><li><strong>Vinted:</strong> eignet sich gut für kleinere Kindersets.</li><li><strong>BrickLink:</strong> ein Marktplatz für einzelne Teile und Minifiguren, praktisch, wenn du sie einzeln verkaufst.</li></ul>',
      },
      {
        h2: 'Preis mit FlipLens prüfen',
        html: '<p>Fotografier den Karton oder die Bauanleitung. FlipLens liest die Setnummer und vergleicht Angebote genau dieses Sets, ohne reine Anleitungen, unvollständige Sets, Kopien und Bundles. Es sucht auf eBay in fünf EU-Ländern oder auf eBay.co.uk, korrigiert die Angebotspreise nach unten und zeigt dir den Höchstpreis, der sich beim Einkauf noch lohnt.</p><p>Du sortierst eine ganze Kiste voller Sets? Nutz den Modus "Viele Artikel auf einmal": ein Foto pro Set, Preise für alle und die Anzeigen gleich geschrieben. Siehe <a href="/de/guides/how-to-check-resale-value">Wiederverkaufswert prüfen</a> und die <a href="/de/guides/flea-market-reselling-checklist">Flohmarkt-Checkliste</a>.</p>',
      },
    ],
    faq: [
      { q: 'Wo finde ich die LEGO-Setnummer?', a: 'Die Setnummer hat 4 bis 6 Ziffern und steht auf dem Karton, vorn auf der Bauanleitung und im LEGO-Katalog. Sie bestimmt das genaue Set.' },
      { q: 'Wie stark senken fehlende Minifiguren den Wert?', a: 'Stark. Minifiguren und Anleitung prüfen Käufer zuerst, ein Set ohne sie bringt deutlich weniger als ein vollständiges. Prüf vor dem Verkauf die Teileliste zur Setnummer.' },
      { q: 'Sind kompatible Steine wie Lepin so viel wert wie LEGO?', a: 'Nein. Kopien und kompatible Steine sind kein LEGO und bringen viel weniger. FlipLens lässt Kopien beim Preisvergleich weg.' },
    ],
  },
  {
    path: '/guides/resale-value-books-vinyl-dvds',
    kind: 'article',
    crumb: 'Bücher, Vinyl, CDs und DVDs',
    parent: { path: '/guides', name: 'Ratgeber' },
    title: 'Bücher, Schallplatten, CDs und DVDs: Was sind sie noch wert?',
    description: 'So findest du heraus, was gebrauchte Bücher, Schallplatten, CDs und DVDs wert sind: Barcode, Ausgabe und Format, Ankaufdienste oder selbst verkaufen.',
    h1: 'Was sind meine Bücher, Schallplatten, CDs und DVDs wert?',
    lead: 'Die meisten Bücher, CDs und DVDs bringen gebraucht ein paar Euro, einige Ausgaben aber deutlich mehr. Der Barcode sagt dir genau, welche Ausgabe du hast, und dort fängt der Preis an.',
    sections: [
      {
        h2: 'Der Barcode bestimmt die Ausgabe',
        html: '<p>Bücher tragen eine ISBN, Musik und Filme einen EAN-Barcode. Beide bestimmen die genaue Ausgabe, nicht nur den Titel. Derselbe Roman oder dasselbe Album kann in vielen Ausgaben zu sehr unterschiedlichen Preisen existieren, vergleich also immer denselben Barcode.</p>',
      },
      {
        h2: 'Ausgabe und Format zählen',
        html: '<ul><li><strong>Bücher:</strong> Erstausgaben, signierte Exemplare und Hardcover sind meist mehr wert als spätere Auflagen und Taschenbücher.</li><li><strong>Vinyl:</strong> eine Originalpressung ist oft mehr wert als eine Neuauflage. 180g-Pressungen, farbiges Vinyl und Picture Discs haben eigene Preise.</li><li><strong>Filme:</strong> DVD, Blu-ray und 4K sind verschiedene Produkte. Steelbooks und vollständige Boxsets bringen oft mehr.</li><li><strong>Zustand:</strong> Kratzer, ein abgenutztes Cover, eine beschädigte Hülle, Notizen oder Unterstreichungen senken den Preis. Fehlende Booklets oder Discs in einem Boxset senken ihn stark.</li></ul>',
      },
      {
        h2: 'Was sich wirklich lohnt',
        html: '<p>Massenware bei Büchern, CDs und DVDs bringt gebraucht meist ein paar Euro pro Stück. Der Wert liegt in seltenen Ausgaben, gefragtem Vinyl und vollständigen Boxsets. Günstige Artikel verkaufen sich gut als Paket: eine Buchreihe, ein Stapel CDs eines Künstlers oder mehrere Filme in einer Anzeige sparen Versand und Zeit.</p>',
      },
      {
        h2: 'Ankaufdienst oder selbst verkaufen',
        html: '<ul><li><strong>Ankaufdienste:</strong> etwa Momox und reBuy in Deutschland oder WeBuyBooks und Ziffit in Großbritannien. Du scannst den Barcode, bekommst ein Angebot und schickst die Artikel ein. Sie zahlen schnell, aber wenig.</li><li><strong>eBay und Vinted:</strong> selbst verkaufen macht mehr Arbeit, bringt bei wertvollen Ausgaben, Vinyl und Boxsets aber meist mehr.</li><li><strong>Lokal:</strong> Flohmärkte und Kleinanzeigen, gut für Pakete und Kisten mit günstigen Artikeln.</li></ul>',
      },
      {
        h2: 'Preis mit FlipLens prüfen',
        html: '<p>Scann den Barcode oder fotografier das Cover. FlipLens sucht die genaue Ausgabe über ihren Barcode auf eBay in fünf EU-Ländern oder auf eBay.co.uk, korrigiert die Angebotspreise nach unten und zeigt dir den Höchstpreis, der sich beim Einkauf noch lohnt.</p><p>Für eine Kiste Bücher oder einen Stapel Platten nutzt du den Modus "Viele Artikel auf einmal": ein Foto pro Artikel, Preise für alle und die Anzeigen gleich geschrieben. Siehe <a href="/de/guides/how-to-check-resale-value">Wiederverkaufswert prüfen</a> und die <a href="/de/guides/flea-market-reselling-checklist">Flohmarkt-Checkliste</a>.</p>',
      },
    ],
    faq: [
      { q: 'Sind meine alten Bücher und DVDs noch etwas wert?', a: 'Die meisten Bücher, CDs und DVDs aus der Massenware bringen ein paar Euro. Seltene Ausgaben, gefragtes Vinyl und vollständige Boxsets sind mehr wert. Prüf den Barcode, um die genaue Ausgabe zu finden.' },
      { q: 'Ankaufdienst oder selbst verkaufen?', a: 'Ankaufdienste zahlen schnell, aber wenig. Selbst auf eBay oder Vinted zu verkaufen bringt bei wertvollen Artikeln meist mehr, günstige Artikel verkaufen sich oft am besten als Paket.' },
      { q: 'Kann FlipLens eine ganze Kiste Bücher oder Platten bewerten?', a: 'Ja. Im Modus "Viele Artikel auf einmal" machst du ein Foto pro Artikel, FlipLens bewertet alle und schreibt die Anzeigen.' },
    ],
  },
  {
    path: '/about',
    kind: 'page',
    crumb: 'Über uns',
    title: 'Über FlipLens: unabhängiger Wiederverkaufswert-Check für UK und Europa',
    description: 'Wer FlipLens betreibt, woher die Preise kommen und welche Grundsätze gelten: keine Fotos gespeichert, keine eBay-Daten gespeichert, ehrlich bei Unsicherheit, unabhängig von eBay und Vinted.',
    h1: 'Über FlipLens',
    lead: 'FlipLens hilft allen, die gebraucht kaufen, um weiterzuverkaufen, in Sekunden zu entscheiden, ob sich ein Artikel lohnt, mit echten Marktplatzdaten aus ganz Europa.',
    sections: [
      {
        h2: 'Was es ist',
        html: '<p>Eine Web-App für Reseller und Schnäppchenjäger. Mach ein Foto, scann einen Barcode oder tipp ein Modell ein, und FlipLens zeigt Wiederverkaufsspanne, Gewinn nach Gebühren und Versand, den Höchstpreis und ein klares Urteil. Außerdem schreibt es aus einem Foto Anzeigen für Vinted, eBay und Kleinanzeigen und hält fest, was du gekauft und verkauft hast.</p>',
      },
      {
        h2: 'Wer dahintersteht',
        html: `<p>FlipLens wird von ${esc(LEGAL.operator)} in Slowenien betrieben. Kontakt: <a href="mailto:${LEGAL.supportEmail}">${LEGAL.supportEmail}</a>. Creator und Partner: siehe <a href="/de/partner">Partnerprogramm</a>.</p>`,
      },
      {
        h2: 'Woher die Daten kommen',
        html: '<p>Die Preise stammen aus aktiven eBay-Angeboten, gelesen über die offizielle eBay-API: in Deutschland, Frankreich, Italien, Spanien und den Niederlanden, mit Wechselkursen der Europäischen Zentralbank in Euro umgerechnet, oder auf eBay.co.uk in Pfund für Verkäufer in Großbritannien. Die Artikelerkennung nutzt ein KI-Bildmodell. Details und Grenzen erklärt <a href="/de/how-it-works">So funktioniert\'s</a>.</p>',
      },
      {
        h2: 'Grundsätze',
        html: '<ul><li><strong>Fotos werden nie gespeichert.</strong> Sie dienen nur dazu, den Artikel zu erkennen oder die Anzeige zu schreiben.</li><li><strong>Keine eBay-Daten werden gespeichert.</strong> Angebote werden live gelesen und nur kurz zwischengespeichert, wie es die Lizenz der eBay-API verlangt.</li><li><strong>Ehrlich bei Unsicherheit.</strong> Jede Schätzung zeigt ihre Sicherheit; bei zu wenig Daten sagt FlipLens das, statt zu raten.</li><li><strong>Unabhängig.</strong> FlipLens gehört nicht zu eBay, Vinted oder Kleinanzeigen und kauft, verkauft oder versendet keine Artikel.</li></ul>',
      },
      {
        h2: 'Sprachen',
        html: '<p>FlipLens gibt es auf Englisch, Deutsch, Italienisch und Französisch. Die App folgt der Sprache deines Browsers; die englischen Seiten findest du unter <a href="/" hreflang="en" lang="en">fliplens.eu</a>, die italienischen unter <a href="/it" hreflang="it" lang="it">fliplens.eu/it</a> und die französischen unter <a href="/fr" hreflang="fr" lang="fr">fliplens.eu/fr</a>. Siehe auch <a href="/privacy">Datenschutz</a> und <a href="/terms">Nutzungsbedingungen</a>.</p>',
      },
    ],
  },
];

const GUIDES_DE = PAGES_DE.filter((p) => p.path.startsWith('/guides/'));
PAGES_DE.push({
  path: '/guides',
  kind: 'page',
  crumb: 'Ratgeber',
  title: 'Reseller-Ratgeber für Europa: Preise, Gebühren und Einkauf',
  description: 'Praktische Ratgeber für Reseller in Europa: Wiederverkaufswert prüfen, eBay.de-Gebühren, wo du gebrauchte Elektronik verkaufst, Verkaufen auf Vinted und eine Flohmarkt-Checkliste.',
  h1: 'Ratgeber',
  lead: 'Kurze, praktische Ratgeber zum Einkaufen und Weiterverkaufen gebrauchter Artikel in Europa.',
  sections: [
    {
      h2: 'Alle Ratgeber',
      html: `<ul class="guide-list">${GUIDES_DE.map((g) => `<li><a href="${href('de', g.path)}">${esc(g.h1)}</a><br><span>${esc(g.description)}</span></li>`).join('')}</ul>`,
    },
  ],
});

// ---------- rendering ----------

PAGES_DE.push({
  path: '/partner',
  kind: 'page',
  crumb: 'Partnerprogramm',
  cta: `<p class="cta"><a class="btn" href="/de">Hol dir deinen Link</a><span>Mit Google anmelden, Profil öffnen, "Freunde einladen". Kostenlos.</span></p>`,
  title: `FlipLens Partnerprogramm: ${REFERRAL.sharePct} % Provision für ${REFERRAL.months} Monate`,
  description: `Empfiehl FlipLens Resellern und verdiene ${REFERRAL.sharePct} % jeder Zahlung der Leute, die du einlädst, ${REFERRAL.months} Monate lang. Deine Community bekommt ${INVITE_BONUS_CHECKS} zusätzliche Gratis-Checks. Auszahlung ab ${deEur(REFERRAL.minPayoutMinor)}.`,
  h1: `${REFERRAL.sharePct} % Provision, ${REFERRAL.months} Monate lang`,
  lead: 'Du machst Videos über Flohmarktfunde, Flips oder Verkaufen auf Vinted? Zeig deiner Community FlipLens und verdiene an jeder Person, die über deinen Link ein Abo abschließt.',
  sections: [
    {
      h2: 'Für wen',
      html: '<p>Reseller und Creator auf TikTok, Instagram und YouTube, die über Flohmärkte, Second-Hand-Funde, Elektronik-Flips oder Verkaufen auf Vinted, eBay und Kleinanzeigen posten. Auch ganz normale Nutzer können mitmachen: Jedes FlipLens-Konto hat einen Einladungslink.</p>',
    },
    {
      h2: 'Was du verdienst',
      html: `<ul><li><strong>${REFERRAL.sharePct} % jeder Zahlung</strong> der Leute, die sich über deinen Link registrieren, ohne Steuern.</li><li><strong>${REFERRAL.months} Monate lang</strong> ab der ersten Zahlung der jeweiligen Person, Verlängerungen inklusive.</li><li>Einnahmen werden ${REFERRAL.holdDays} Tage nach jeder Zahlung auszahlbar (Widerrufsfrist).</li><li>Auszahlung ab ${deEur(REFERRAL.minPayoutMinor)} per PayPal oder Überweisung, direkt in der App anfragen.</li></ul><p>Beispiel: ${EXAMPLE_PEOPLE} Leute mit Pro (${deEur(PLANS.pro.priceMonthlyMinor)} im Monat) bringen dir etwa <strong>${deEur(exampleMinor)} im Monat</strong>, ${REFERRAL.months} Monate lang.</p>`,
    },
    {
      h2: 'Was deine Community bekommt',
      html: `<p>Wer über deinen Link ein neues Konto anlegt, bekommt im ersten Monat <strong>${INVITE_BONUS_CHECKS} zusätzliche Gratis-Checks</strong>, zusätzlich zum kostenlosen Tarif. Damit prüft man, wofür sich ein Artikel weiterverkaufen lässt, sieht den Gewinn nach Gebühren und schreibt aus einem Foto Anzeigen für Vinted, eBay oder Kleinanzeigen.</p>`,
    },
    {
      h2: "So machst du mit",
      html: `<ol><li>Melde dich auf <a href="/de">fliplens.eu</a> mit Google an.</li><li>Öffne Profil und dann "Freunde einladen".</li><li>Kopier deinen Link (fliplens.eu/de?ref=deincode) und teil ihn in Bio, Videos und Storys.</li></ol><p>Du möchtest einen eigenen Code wie <code>?ref=anna</code>? Schreib nach der Anmeldung an <a href="mailto:${LEGAL.supportEmail}">${LEGAL.supportEmail}</a>.</p>`,
    },
    {
      h2: 'Ideen für Content',
      html: '<ul><li>Flohmarkt-Check: "Lohnt sich der Kauf?" mit dem Urteil im Bild.</li><li>Vorher-nachher-Flips mit dem echten Gewinn.</li><li>"Daraus habe ich in 10 Sekunden eine Vinted-Anzeige gemacht."</li><li>Fund-Karten aus der App in deinen Storys teilen.</li></ul>',
    },
    {
      h2: 'Regeln',
      html: '<ul><li>Kennzeichne gesponserte Inhalte als Werbung ("Werbung" oder "Anzeige").</li><li>Keine irreführenden Versprechen zu Gewinnen oder Ergebnissen, kein Spam.</li><li>Keine Suchanzeigen auf den Namen FlipLens, keine Selbsteinladungen oder Zweitkonten.</li></ul><p>Alle Regeln: <a href="/terms">Nutzungsbedingungen</a>, Abschnitt "Empfehlungsprogramm".</p>',
    },
    {
      h2: 'Markenmaterial',
      html: '<p><a href="/og.png">Vorschaubild (1200×630)</a> · <a href="/icons/icon-512.png">App-Icon (512×512)</a></p>',
    },
  ],
  faq: [
    { q: 'Kostet die Teilnahme etwas?', a: 'Nein. Jeder angemeldete Nutzer hat einen Einladungslink, der kostenlose Tarif reicht zum Mitmachen.' },
    { q: 'Wie lange verdiene ich an einer eingeladenen Person?', a: `${REFERRAL.months} Monate ab ihrer ersten Zahlung. Du bekommst ${REFERRAL.sharePct} % jeder Zahlung in dieser Zeit, Verlängerungen inklusive.` },
    { q: 'Wann und wie werde ich ausgezahlt?', a: `Einnahmen werden ${REFERRAL.holdDays} Tage nach jeder Zahlung auszahlbar. Ab ${deEur(REFERRAL.minPayoutMinor)} kannst du in der App eine Auszahlung per PayPal oder Überweisung anfragen; sie erfolgt in der Regel innerhalb von 14 Tagen.` },
    { q: 'Wer zahlt Steuern auf meine Einnahmen?', a: 'Du selbst. Einnahmen werden ohne Steuerabzug ausgezahlt; gib sie so an, wie es in deinem Land vorgeschrieben ist.' },
  ],
});

const UI: Record<'en' | 'de', UiStrings> = {
  en: {
    nav: [['/how-it-works', 'How it works'], ['/pricing', 'Pricing'], ['/guides', 'Guides'], ['/faq', 'FAQ']],
    tryFree: 'Try free',
    privacy: 'Privacy',
    terms: 'Terms',
    partner: 'Partner programme',
    about: 'About',
    compare: 'Ways to check resale value',
    disclaimer: 'FlipLens is not affiliated with eBay. eBay data shown via the eBay API.',
    questions: 'Questions',
    answers: 'Answers',
    updated: (d: string) => `Updated ${d} · by FlipLens`,
    locale: 'en_GB',
    cta: CTA,
  },
  de: {
    nav: [['/how-it-works', "So funktioniert's"], ['/pricing', 'Preise'], ['/guides', 'Ratgeber'], ['/faq', 'FAQ']],
    tryFree: 'Gratis testen',
    privacy: 'Datenschutz',
    terms: 'Nutzungsbedingungen',
    partner: 'Partnerprogramm',
    about: 'Über uns',
    compare: 'Methoden im Vergleich',
    disclaimer: 'FlipLens gehört nicht zu eBay. eBay-Daten werden über die eBay-API angezeigt.',
    questions: 'Fragen',
    answers: 'Antworten',
    updated: (d: string) => `Aktualisiert am ${d.split('-').reverse().join('.')} · von FlipLens`,
    locale: 'de_DE',
    cta: CTA_DE,
  },
};

/** Links to the same page in the other languages. */
const otherLangs = (lang: Lang, path: string): string =>
  LANGS.filter((l) => l !== lang).map((l) => `<a href="${href(l, path)}" hreflang="${l}" lang="${l}">${LANG_NAMES[l]}</a>`).join(' ');

function nav(lang: Lang, path: string): string {
  const u = PACKS[lang].ui;
  return `<header class="top"><a class="brand" href="${href(lang, '/')}"><img src="/icons/icon.svg" alt="" width="28" height="28"> FlipLens</a><nav>${u.nav.map(([p, n]) => `<a href="${href(lang, p)}">${n}</a>`).join('')}<span class="langs">${otherLangs(lang, path)}</span><a class="btn small" href="${href(lang, '/')}">${u.tryFree}</a></nav></header>`;
}

function footer(lang: Lang, path: string): string {
  const u = PACKS[lang].ui;
  const links = [...u.nav.map(([p, n]) => `<a href="${href(lang, p)}">${n}</a>`), `<a href="${href(lang, '/partner')}">${u.partner}</a>`, `<a href="${href(lang, '/best-resale-value-apps')}">${u.compare}</a>`, `<a href="${href(lang, '/about')}">${u.about}</a>`, `<a href="/privacy">${u.privacy}</a>`, `<a href="/terms">${u.terms}</a>`, `<a href="mailto:${LEGAL.supportEmail}">${LEGAL.supportEmail}</a>`];
  const switcher = LANGS.map((l) => (l === lang ? LANG_NAMES[l] : `<a href="${href(l, path)}" hreflang="${l}" lang="${l}">${LANG_NAMES[l]}</a>`)).join(' | ');
  return `<footer><p>${links.join(' · ')}</p><p>${switcher}</p><p>© ${new Date().getFullYear()} ${esc(LEGAL.operator)}. ${u.disclaimer}</p></footer>`;
}

const ORG = { '@type': 'Organization', '@id': `${SITE}/#org`, name: 'FlipLens', url: SITE, logo: `${SITE}/icons/icon-512.png`, email: LEGAL.supportEmail };

function faqLd(faq: Faq[], lang: Lang) {
  return { '@type': 'FAQPage', inLanguage: lang, mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) };
}

/** hreflang alternates: every page exists in all languages, English is the default. */
function alternates(path: string): string[] {
  return [
    ...LANGS.map((l) => `<link rel="alternate" hreflang="${l}" href="${SITE}${href(l, path)}">`),
    `<link rel="alternate" hreflang="x-default" href="${SITE}${href('en', path)}">`,
  ];
}

function head(o: { title: string; description: string; path: string; lang: Lang; type: 'website' | 'article'; ld: unknown[] }): string {
  const url = `${SITE}${href(o.lang, o.path)}`;
  return [
    `<title>${esc(o.title)}</title>`,
    `<meta name="description" content="${esc(o.description)}">`,
    `<link rel="canonical" href="${url}">`,
    ...alternates(o.path),
    `<meta property="og:type" content="${o.type}">`,
    `<meta property="og:site_name" content="FlipLens">`,
    `<meta property="og:title" content="${esc(o.title)}">`,
    `<meta property="og:description" content="${esc(o.description)}">`,
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:image" content="${SITE}/og.png">`,
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="630">`,
    `<meta property="og:locale" content="${PACKS[o.lang].ui.locale}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${esc(o.title)}">`,
    `<meta name="twitter:description" content="${esc(o.description)}">`,
    `<meta name="twitter:image" content="${SITE}/og.png">`,
    `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': o.ld }).replace(/</g, '\\u003c')}</script>`,
  ].join('\n    ');
}

function renderPage(p: Page, lang: Lang): string {
  const u = PACKS[lang].ui;
  const crumbs = [{ path: '/', name: 'FlipLens' }, ...(p.parent ? [p.parent] : []), { path: p.path, name: p.crumb }];
  const url = `${SITE}${href(lang, p.path)}`;
  const ld: unknown[] = [
    ORG,
    { '@type': 'BreadcrumbList', itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: `${SITE}${href(lang, c.path)}` })) },
    p.kind === 'article'
      ? { '@type': 'Article', headline: p.h1, description: p.description, inLanguage: lang, datePublished: UPDATED, dateModified: UPDATED, author: { '@id': `${SITE}/#org` }, publisher: { '@id': `${SITE}/#org` }, image: `${SITE}/og.png`, mainEntityOfPage: url }
      : { '@type': p.path === '/about' ? 'AboutPage' : 'WebPage', name: p.title, description: p.description, inLanguage: lang, url, isPartOf: { '@id': `${SITE}/#website` }, ...(p.path === '/about' && { about: { '@id': `${SITE}/#org` } }) },
    ...(p.faq ? [faqLd(p.faq, lang)] : []),
  ];
  const faqHtml = p.faq
    ? `<section><h2>${p.sections.length ? u.questions : u.answers}</h2>${p.faq.map((f) => `<details open><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('')}</section>`
    : '';
  return `<!doctype html>
<!-- Generated by apps/web/scripts/site.ts. Edit the script, not this file. -->
<html lang="${lang}">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="theme-color" content="#0f766e">
    <link rel="icon" href="/icons/icon.svg" type="image/svg+xml">
    <link rel="apple-touch-icon" href="/icons/icon-192.png">
    <link rel="stylesheet" href="/site.css">
    ${head({ title: p.title, description: p.description, path: p.path, lang, type: p.kind === 'article' ? 'article' : 'website', ld })}
  </head>
  <body>
    ${nav(lang, p.path)}
    <main>
      <nav class="crumbs" aria-label="Breadcrumb">${crumbs.map((c, i) => (i === crumbs.length - 1 ? `<span>${esc(c.name)}</span>` : `<a href="${href(lang, c.path)}">${esc(c.name)}</a>`)).join(' / ')}</nav>
      <article>
        <h1>${esc(p.h1)}</h1>
        <p class="lead">${esc(p.lead)}</p>
        ${p.kind === 'article' ? `<p class="meta">${u.updated(UPDATED)}</p>` : ''}
        ${p.sections.map((s) => `<section><h2>${esc(s.h2)}</h2>${s.html}</section>`).join('\n        ')}
        ${faqHtml}
        ${p.cta ?? u.cta}
      </article>
    </main>
    ${footer(lang, p.path)}
  </body>
</html>
`;
}

// ---------- index.html (the app shell): meta, JSON-LD, prerendered landing ----------

const HOME_TITLE = 'FlipLens: is it worth buying to resell? Resale value checker for the UK and Europe';
const HOME_DESC = 'Photo, barcode or model: see what used electronics, sneakers and branded clothes resell for on eBay in the UK and 5 EU countries, your profit and the most to pay.';

function homeHead(): string {
  return head({
    title: HOME_TITLE,
    description: HOME_DESC,
    path: '/',
    lang: 'en',
    type: 'website',
    ld: [
      ORG,
      { '@type': 'WebSite', '@id': `${SITE}/#website`, name: 'FlipLens', url: SITE, publisher: { '@id': `${SITE}/#org` }, inLanguage: [...LANGS] },
      {
        '@type': 'WebApplication',
        name: 'FlipLens',
        url: SITE,
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web, iOS, Android',
        description: HOME_DESC,
        inLanguage: [...LANGS],
        publisher: { '@id': `${SITE}/#org` },
        offers: plans.map((p) => ({ '@type': 'Offer', name: p.name, price: (p.priceMonthlyMinor / 100).toFixed(2), priceCurrency: 'EUR', description: p.features.join('; '), url: `${SITE}/pricing` })),
      },
      faqLd(COMMON_FAQ, 'en'),
    ],
  });
}

/** Text of the start page for crawlers without JavaScript. React replaces it on load; keep in step with screens/Landing.tsx. */
function homePrerender(): string {
  return `<div class="prerender">
      <header><strong>FlipLens</strong> · <a href="/how-it-works">How it works</a> · <a href="/pricing">Pricing</a> · <a href="/guides">Guides</a> · <a href="/faq">FAQ</a> · <a href="/de" hreflang="de" lang="de">Deutsch</a> · <a href="/it" hreflang="it" lang="it">Italiano</a> · <a href="/fr" hreflang="fr" lang="fr">Français</a></header>
      <h1>Know what it's worth before you buy it.</h1>
      <p>For resellers in the UK and Europe. Take a photo, scan the barcode or type the model: FlipLens shows what the item resells for on eBay.co.uk or on eBay in Germany, France, Italy, Spain and the Netherlands, your profit after fees and shipping, the most you should pay, and a clear verdict: strong buy, buy, borderline or skip.</p>
      <h2>Three taps, a few seconds</h2>
      <ol><li>Scan it: photo of the item or its label, the barcode on the box, or just type the model.</li><li>Enter the price (optional): without it you get the maximum price worth paying.</li><li>Get the verdict, with the numbers and the reasons behind it.</li></ol>
      <h2>Built for buying decisions, not guesses</h2>
      <ul><li>Electronics, consoles, cameras, sneakers, branded clothes and bags. Clothes are priced by brand, type and condition, for women, men or kids.</li><li>Exact model, not "headphones": wrong variants, accessories, bundles and broken items are filtered out.</li><li>Live market data from eBay in five EU countries in euro, or from eBay.co.uk in pounds. You can see every listing used.</li><li>Profit after marketplace fees and shipping, plus the maximum price worth paying.</li><li>Honest about uncertainty: every verdict shows its confidence; not enough data means no number.</li><li>Selling? Turn a photo of any item, clothes included, into a Vinted, eBay or Kleinanzeigen listing: <a href="/vinted-listing-generator">listing generator</a>.</li></ul>
      <h2>Pricing</h2>
      <ul>${plans.map((p) => `<li>${esc(p.name)}: ${p.priceMonthlyMinor ? `${eur(p.priceMonthlyMinor)} per month` : 'free'}. ${p.features.map(esc).join(', ')}.</li>`).join('')}</ul>
      <h2>Questions</h2>
      ${COMMON_FAQ.map((f) => `<h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>`).join('')}
      <h2>Guides</h2>
      <ul>${GUIDES.map((g) => `<li><a href="${g.path}">${esc(g.h1)}</a></li>`).join('')}</ul>
      <p><a href="/partner">Partner programme: earn ${REFERRAL.sharePct}% for ${REFERRAL.months} months</a> · <a href="/privacy">Privacy Policy</a> · <a href="/terms">Terms of Service</a> · Not affiliated with eBay.</p>
    </div>`;
}

/** German start-page text for crawlers on /de; the API swaps it into the shell (apps/api/src/web.ts). */
function homePrerenderDe(): string {
  return `<div class="prerender" lang="de">
      <header><strong>FlipLens</strong> · <a href="/de/how-it-works">So funktioniert's</a> · <a href="/de/pricing">Preise</a> · <a href="/de/guides">Ratgeber</a> · <a href="/de/faq">FAQ</a> · <a href="/" hreflang="en" lang="en">English</a> · <a href="/it" hreflang="it" lang="it">Italiano</a> · <a href="/fr" hreflang="fr" lang="fr">Français</a></header>
      <h1>Wisse, was es wert ist, bevor du es kaufst.</h1>
      <p>Für Reseller in Europa und Großbritannien. Mach ein Foto, scann den Barcode oder tipp das Modell ein: FlipLens zeigt, wofür der Artikel auf eBay in Deutschland, Frankreich, Italien, Spanien und den Niederlanden oder auf eBay.co.uk weiterverkauft wird, deinen Gewinn nach Gebühren und Versand, den Höchstpreis, den du zahlen solltest, und ein klares Urteil: Klarer Kauf, Kaufen, Grenzwertig oder Finger weg.</p>
      <h2>Drei Tipps, ein paar Sekunden</h2>
      <ol><li>Scannen: Foto vom Artikel oder Typenschild, Barcode auf der Verpackung oder einfach das Modell eintippen.</li><li>Preis eingeben (optional): Ohne Preis bekommst du den Höchstpreis, der sich noch lohnt.</li><li>Urteil bekommen, mit den Zahlen und den Gründen dahinter.</li></ol>
      <h2>Gebaut für Kaufentscheidungen, nicht fürs Raten</h2>
      <ul><li>Elektronik, Konsolen, Kameras, Sneaker, Markenkleidung und Taschen. Kleidung wird nach Marke, Art und Zustand bewertet, für Damen, Herren oder Kinder.</li><li>Genaues Modell statt "Kopfhörer": falsche Varianten, Zubehör, Bundles und defekte Artikel werden aussortiert.</li><li>Aktuelle Marktdaten von eBay in fünf EU-Ländern in Euro oder von eBay.co.uk in Pfund. Du siehst jedes verwendete Angebot.</li><li>Gewinn nach Marktplatzgebühren und Versand, dazu der Höchstpreis, der sich noch lohnt.</li><li>Ehrlich bei Unsicherheit: Jedes Urteil zeigt seine Sicherheit; zu wenig Daten heißt keine Zahl.</li><li>Du verkaufst? Mach aus dem Foto eines beliebigen Artikels, auch Kleidung, eine Anzeige für Vinted, eBay oder Kleinanzeigen: <a href="/de/vinted-listing-generator">Anzeigen-Generator</a>.</li></ul>
      <h2>Preise</h2>
      <ul>${plans.map((p) => `<li>${esc(p.name)}: ${p.priceMonthlyMinor ? `${deEur(p.priceMonthlyMinor)} pro Monat` : 'kostenlos'}. ${(DE_FEATURES[p.id] ?? []).map(esc).join(', ')}.</li>`).join('')}</ul>
      <h2>Fragen</h2>
      ${COMMON_FAQ_DE.map((f) => `<h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>`).join('')}
      <h2>Ratgeber</h2>
      <ul>${GUIDES_DE.map((g) => `<li><a href="${href('de', g.path)}">${esc(g.h1)}</a></li>`).join('')}</ul>
      <p><a href="/de/partner">Partnerprogramm: ${REFERRAL.sharePct} % Provision für ${REFERRAL.months} Monate</a> · <a href="/privacy">Datenschutz</a> · <a href="/terms">Nutzungsbedingungen</a> · FlipLens gehört nicht zu eBay.</p>
    </div>`;
}

const PACKS: Record<Lang, LangPack> = {
  en: { pages: PAGES, commonFaq: COMMON_FAQ, ui: UI.en, home: { title: HOME_TITLE, description: HOME_DESC, prerender: '' } },
  de: {
    pages: PAGES_DE,
    commonFaq: COMMON_FAQ_DE,
    ui: UI.de,
    home: {
      title: 'FlipLens: Lohnt sich der Kauf zum Wiederverkauf? Wiederverkaufswert-Check für Europa',
      description: 'Foto, Barcode oder Modell: FlipLens zeigt, was gebrauchte Elektronik, Sneaker und Markenkleidung auf eBay in UK und 5 EU-Ländern bringen, deinen Gewinn und den Höchstpreis.',
      prerender: homePrerenderDe(),
    },
  },
  it: IT,
  fr: FR,
};

function replaceBetween(src: string, name: string, content: string): string {
  const re = new RegExp(`(<!-- ${name}:start -->)[\\s\\S]*?(<!-- ${name}:end -->)`);
  if (!re.test(src)) throw new Error(`index.html is missing the ${name} markers`);
  return src.replace(re, `$1\n    ${content}\n    $2`);
}

// ---------- sitemap, robots, llms ----------

/** Base paths that exist in every language. */
const BILINGUAL = ['/', ...PAGES.map((p) => p.path).sort()];
const URLS = [...BILINGUAL.flatMap((p) => LANGS.map((l) => href(l, p))), '/privacy', '/terms'];

function sitemap(): string {
  const alt = (p: string) =>
    LANGS.map((l) => `<xhtml:link rel="alternate" hreflang="${l}" href="${SITE}${href(l, p)}"/>`).join('') +
    `<xhtml:link rel="alternate" hreflang="x-default" href="${SITE}${href('en', p)}"/>`;
  const entries = [
    ...BILINGUAL.flatMap((p) => LANGS.map((l) => `  <url><loc>${SITE}${href(l, p)}</loc><lastmod>${UPDATED}</lastmod>${alt(p)}</url>`)),
    ...['/privacy', '/terms'].map((u) => `  <url><loc>${SITE}${u}</loc><lastmod>${UPDATED}</lastmod></url>`),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries.join('\n')}
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
Disallow: /prerender-de.html
Disallow: /prerender-it.html
Disallow: /prerender-fr.html
Disallow: /home-meta.json

${aiBots.map((b) => `User-agent: ${b}\nAllow: /\nDisallow: /api/`).join('\n\n')}

Sitemap: ${SITE}/sitemap.xml
`;
}

function llms(): string {
  return `# FlipLens

> FlipLens (${SITE}) is a web app for resellers in Europe that answers "I can buy this for €X: is it worth buying to resell?". From a photo, a barcode or a typed model it identifies the exact product, reads comparable active eBay listings in Germany, France, Italy, Spain and the Netherlands (in euro) or on eBay.co.uk (in pounds), estimates the resale value, subtracts marketplace fees and shipping, and returns profit, ROI, the maximum price worth paying and a verdict (strong buy, buy, borderline, skip). It is independent, not affiliated with eBay, and does not buy, sell or ship items.

Key facts:
- Works best for consumer electronics, gaming and cameras (headphones, phones, tablets, laptops, consoles, controllers, games, camera bodies, lenses) and power tools. Branded clothes, shoes and bags are priced too, by brand, type and condition (a rougher estimate than for electronics). LEGO sets by set number; books, vinyl, CDs and DVDs by barcode. Watches by model; branded jewellery by brand and type (unbranded gold and silver, furniture and vehicles are not priced).
- The purchase price is optional: without it FlipLens shows the maximum price worth paying for the user's target ROI.
- Fee profiles: eBay.de private and business sellers, eBay.it and eBay.fr private sellers, eBay.co.uk private sellers, Vinted, local pickup. Each shows when it was last checked.
- Table scan: one photo of a stall, box or shelf finds up to 6 items and checks each against eBay listings, best buys first. Live radar: with the camera open, items get boxes with their names as the phone moves; a tap runs a real check before any price is shown. Both for Google sign-in accounts, Free included.
- Users selling on eBay.co.uk (the default for the United Kingdom, selectable from any country) get eBay.co.uk data and prices in pounds; eBay.de sellers get the five EU sites in euro. A UK vs EU comparison on the result shows the checked item on eBay.co.uk and on the five EU sites side by side, in pounds and euros, without using a check.
- When fewer than 5 comparable listings remain it says "not enough market data" instead of guessing.
- Pricing (EUR, final prices): ${planLine}.
- Also: a listing writer that turns a photo of any item (clothes included) into a Vinted, eBay or Kleinanzeigen title and description (${PLANS.free.monthlyListings} free per month), and stock tracking with real profit.
- Installs on phones as a web app (PWA). Sign-in with Google. Photos are never stored.
- Available in English, German, Italian and French (the app follows the browser language; German pages under ${SITE}/de, Italian under ${SITE}/it, French under ${SITE}/fr).
- Operator: ${LEGAL.operator}, Slovenia. Contact: ${LEGAL.supportEmail}.

## Product
- [How it works](${SITE}/how-it-works): identification, comparables, estimate, fees, verdict and known limits
- [Pricing](${SITE}/pricing): Free, Pro and Reseller plans
- [FAQ](${SITE}/faq)
- [Ways to check resale value compared](${SITE}/best-resale-value-apps): FlipLens, eBay sold listings, marketplace searches, Google Lens and trade-in offers
- [About FlipLens](${SITE}/about): who runs it, data sources and principles
- [Partner programme](${SITE}/partner): earn ${REFERRAL.sharePct}% of payments from invited users for ${REFERRAL.months} months

## Guides
${GUIDES.map((g) => `- [${g.h1}](${SITE}${g.path}): ${g.description}`).join('\n')}

## Deutsch
- [FlipLens auf Deutsch](${SITE}/de): Start page and app in German
${PAGES_DE.map((p) => `- [${p.h1}](${SITE}${href('de', p.path)})`).join('\n')}

## Italiano
- [FlipLens in italiano](${SITE}/it): Start page and app in Italian
${IT.pages.map((p) => `- [${p.h1}](${SITE}${href('it', p.path)})`).join('\n')}

## Français
- [FlipLens en français](${SITE}/fr): Start page and app in French
${FR.pages.map((p) => `- [${p.h1}](${SITE}${href('fr', p.path)})`).join('\n')}

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

for (const lang of LANGS) {
  const pack = PACKS[lang];
  const missing = PAGES.filter((p) => !pack.pages.some((d) => d.path === p.path)).map((p) => p.path);
  if (missing.length) throw new Error(`${lang} version missing for: ${missing.join(', ')}`);
  for (const p of pack.pages) write(lang === 'en' ? `${p.path.slice(1)}.html` : `${lang}${p.path}.html`, renderPage(p, lang));
  if (lang !== 'en') write(`prerender-${lang}.html`, `${pack.home.prerender}\n`);
}
// Meta of the start pages /de, /it, /fr for the API (apps/api/src/web.ts).
write('home-meta.json', `${JSON.stringify(Object.fromEntries(LANGS.filter((l) => l !== 'en').map((l) => [l, { title: PACKS[l].home.title, description: PACKS[l].home.description, locale: PACKS[l].ui.locale }])), null, 2)}\n`);
write('sitemap.xml', sitemap());
write('robots.txt', robots());
write('llms.txt', llms());
write('llms-full.txt', llmsFull());

let index = readFileSync(INDEX, 'utf8');
index = replaceBetween(index, 'seo', homeHead());
index = replaceBetween(index, 'prerender', homePrerender());
writeFileSync(INDEX, index);

console.log(`site: ${PAGES.length} + ${PAGES_DE.length} (de) pages, ${URLS.length} sitemap URLs, llms.txt, robots.txt, prerender-de.html, index.html updated`);
