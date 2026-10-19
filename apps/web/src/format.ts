import { isFashion, toMajor, type CategorySlug, type Condition, type FashionGender, type FashionKind, type Money } from '@fliplens/core';
import { ago as agoI18n, LOCALE, money, tr } from './i18n.js';

export function fmt(m: Money, digits = 0): string {
  return new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency: m.currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(toMajor(m));
}

export function ago(iso: string | null): string {
  return agoI18n(iso);
}

type ConditionMap = { new: string; like_new: string; very_good: string; good: string; fair: string; poor: string; for_parts: string };

export const CONDITION_LABEL: ConditionMap = tr<ConditionMap>({
  en: { new: 'New', like_new: 'Like new', very_good: 'Very good', good: 'Good', fair: 'Fair', poor: 'Poor', for_parts: 'For parts' },
  de: { new: 'Neu', like_new: 'Wie neu', very_good: 'Sehr gut', good: 'Gut', fair: 'Akzeptabel', poor: 'Stark gebraucht', for_parts: 'Defekt / für Bastler' },
  it: { new: 'Nuovo', like_new: 'Come nuovo', very_good: 'Ottimo', good: 'Buono', fair: 'Discreto', poor: 'Scarso', for_parts: 'Per pezzi di ricambio' },
  fr: { new: 'Neuf', like_new: 'Comme neuf', very_good: 'Très bon état', good: 'Bon état', fair: 'État correct', poor: 'Mauvais état', for_parts: 'Pour pièces' },
});

export const CATEGORY_NAME: Record<string, string> = tr<Record<string, string>>({
  en: {
    headphones: 'Headphones', smartphones: 'Smartphones', tablets: 'Tablets', laptops: 'Laptops', smartwatches: 'Smartwatches',
    speakers: 'Speakers', routers: 'Routers', streaming: 'Streaming devices', consoles: 'Game consoles', handhelds: 'Handheld consoles',
    controllers: 'Controllers', games: 'Video games', camera_bodies: 'Cameras', lenses: 'Lenses', action_cameras: 'Action cameras',
    compact_cameras: 'Compact cameras', power_tools: 'Power tools',
    clothing: 'Clothing', shoes: 'Shoes', bags: 'Bags', accessories: 'Fashion accessories', other: 'Other',
  },
  de: {
    headphones: 'Kopfhörer', smartphones: 'Smartphones', tablets: 'Tablets', laptops: 'Laptops', smartwatches: 'Smartwatches',
    speakers: 'Lautsprecher', routers: 'Router', streaming: 'Streaming-Geräte', consoles: 'Spielkonsolen', handhelds: 'Handheld-Konsolen',
    controllers: 'Controller', games: 'Videospiele', camera_bodies: 'Kameras', lenses: 'Objektive', action_cameras: 'Actioncams',
    compact_cameras: 'Kompaktkameras', power_tools: 'Elektrowerkzeuge',
    clothing: 'Kleidung', shoes: 'Schuhe', bags: 'Taschen', accessories: 'Mode-Accessoires', other: 'Sonstiges',
  },
  it: {
    headphones: 'Cuffie', smartphones: 'Smartphone', tablets: 'Tablet', laptops: 'Portatili', smartwatches: 'Smartwatch',
    speakers: 'Altoparlanti', routers: 'Router', streaming: 'Dispositivi di streaming', consoles: 'Console', handhelds: 'Console portatili',
    controllers: 'Controller', games: 'Videogiochi', camera_bodies: 'Fotocamere', lenses: 'Obiettivi', action_cameras: 'Action cam',
    compact_cameras: 'Fotocamere compatte', power_tools: 'Elettroutensili',
    clothing: 'Abbigliamento', shoes: 'Scarpe', bags: 'Borse', accessories: 'Accessori moda', other: 'Altro',
  },
  fr: {
    headphones: 'Casques et écouteurs', smartphones: 'Smartphones', tablets: 'Tablettes', laptops: 'Ordinateurs portables', smartwatches: 'Montres connectées',
    speakers: 'Enceintes', routers: 'Routeurs', streaming: 'Appareils de streaming', consoles: 'Consoles de jeux', handhelds: 'Consoles portables',
    controllers: 'Manettes', games: 'Jeux vidéo', camera_bodies: 'Appareils photo', lenses: 'Objectifs', action_cameras: 'Caméras d’action',
    compact_cameras: 'Appareils photo compacts', power_tools: 'Outillage électrique',
    clothing: 'Vêtements', shoes: 'Chaussures', bags: 'Sacs', accessories: 'Accessoires de mode', other: 'Autres',
  },
});

type KindMap = Record<FashionKind, string>;

export const FASHION_KIND_NAME: KindMap = tr<KindMap>({
  en: {
    jeans: 'Jeans', trousers: 'Trousers', shorts: 'Shorts', skirt: 'Skirt', dress: 'Dress', jumpsuit: 'Jumpsuit', top: 'T-shirt / top',
    shirt: 'Shirt / blouse', sweater: 'Sweater / knit', hoodie: 'Hoodie / sweatshirt', jacket: 'Jacket', coat: 'Coat', suit: 'Suit / blazer',
    swimwear: 'Swimwear', activewear: 'Sportswear', sneakers: 'Sneakers', boots: 'Boots', shoes: 'Shoes', sandals: 'Sandals',
    handbag: 'Handbag', backpack: 'Backpack', wallet: 'Wallet', belt: 'Belt', hat: 'Hat / cap', scarf: 'Scarf', sunglasses: 'Sunglasses',
  },
  de: {
    jeans: 'Jeans', trousers: 'Hose', shorts: 'Shorts', skirt: 'Rock', dress: 'Kleid', jumpsuit: 'Jumpsuit', top: 'T-Shirt / Top',
    shirt: 'Hemd / Bluse', sweater: 'Pullover / Strick', hoodie: 'Hoodie / Sweatshirt', jacket: 'Jacke', coat: 'Mantel', suit: 'Anzug / Blazer',
    swimwear: 'Bademode', activewear: 'Sportbekleidung', sneakers: 'Sneaker', boots: 'Stiefel', shoes: 'Schuhe', sandals: 'Sandalen',
    handbag: 'Handtasche', backpack: 'Rucksack', wallet: 'Geldbörse', belt: 'Gürtel', hat: 'Mütze / Cap', scarf: 'Schal', sunglasses: 'Sonnenbrille',
  },
  it: {
    jeans: 'Jeans', trousers: 'Pantaloni', shorts: 'Shorts', skirt: 'Gonna', dress: 'Abito', jumpsuit: 'Tuta', top: 'T-shirt / top',
    shirt: 'Camicia / blusa', sweater: 'Maglione', hoodie: 'Felpa', jacket: 'Giacca', coat: 'Cappotto', suit: 'Completo / blazer',
    swimwear: 'Costumi da bagno', activewear: 'Abbigliamento sportivo', sneakers: 'Sneakers', boots: 'Stivali', shoes: 'Scarpe', sandals: 'Sandali',
    handbag: 'Borsa', backpack: 'Zaino', wallet: 'Portafoglio', belt: 'Cintura', hat: 'Cappello', scarf: 'Sciarpa', sunglasses: 'Occhiali da sole',
  },
  fr: {
    jeans: 'Jean', trousers: 'Pantalon', shorts: 'Short', skirt: 'Jupe', dress: 'Robe', jumpsuit: 'Combinaison', top: 'T-shirt / haut',
    shirt: 'Chemise / blouse', sweater: 'Pull / maille', hoodie: 'Sweat à capuche', jacket: 'Veste', coat: 'Manteau', suit: 'Costume / blazer',
    swimwear: 'Maillot de bain', activewear: 'Vêtements de sport', sneakers: 'Baskets', boots: 'Bottes', shoes: 'Chaussures', sandals: 'Sandales',
    handbag: 'Sac à main', backpack: 'Sac à dos', wallet: 'Portefeuille', belt: 'Ceinture', hat: 'Chapeau / casquette', scarf: 'Écharpe', sunglasses: 'Lunettes de soleil',
  },
});

type GenderMap = Record<FashionGender, string>;

export const FASHION_GENDER_NAME: GenderMap = tr<GenderMap>({
  en: { women: 'Women', men: 'Men', unisex: 'Unisex', kids: 'Kids' },
  de: { women: 'Damen', men: 'Herren', unisex: 'Unisex', kids: 'Kinder' },
  it: { women: 'Donna', men: 'Uomo', unisex: 'Unisex', kids: 'Bambini' },
  fr: { women: 'Femme', men: 'Homme', unisex: 'Unisexe', kids: 'Enfant' },
});

export const CONDITION_HINT: ConditionMap = tr<ConditionMap>({
  en: {
    new: 'Sealed or unused, in the original packaging.',
    like_new: 'Opened, no visible signs of use.',
    very_good: 'Minimal signs of use, fully working.',
    good: 'Normal signs of use, fully working.',
    fair: 'Clear wear or cosmetic damage, still working.',
    poor: 'Heavy wear or missing parts, still working.',
    for_parts: 'Not working, for repair or parts.',
  },
  de: {
    new: 'Versiegelt oder unbenutzt, in Originalverpackung.',
    like_new: 'Geöffnet, keine sichtbaren Gebrauchsspuren.',
    very_good: 'Minimale Gebrauchsspuren, voll funktionsfähig.',
    good: 'Normale Gebrauchsspuren, voll funktionsfähig.',
    fair: 'Deutliche Gebrauchsspuren oder optische Schäden, funktioniert noch.',
    poor: 'Starke Abnutzung oder fehlende Teile, funktioniert noch.',
    for_parts: 'Funktioniert nicht, für Reparatur oder Ersatzteile.',
  },
  it: {
    new: 'Sigillato o mai usato, nella confezione originale.',
    like_new: 'Aperto, nessun segno d’uso visibile.',
    very_good: 'Minimi segni d’uso, perfettamente funzionante.',
    good: 'Normali segni d’uso, perfettamente funzionante.',
    fair: 'Usura evidente o danni estetici, funziona ancora.',
    poor: 'Forte usura o parti mancanti, funziona ancora.',
    for_parts: 'Non funziona, da riparare o per pezzi di ricambio.',
  },
  fr: {
    new: 'Scellé ou jamais utilisé, dans son emballage d’origine.',
    like_new: 'Ouvert, aucune trace d’usage visible.',
    very_good: 'Traces d’usage minimes, fonctionne parfaitement.',
    good: 'Traces d’usage normales, fonctionne parfaitement.',
    fair: 'Usure nette ou défauts esthétiques, fonctionne encore.',
    poor: 'Forte usure ou pièces manquantes, fonctionne encore.',
    for_parts: 'Ne fonctionne pas, pour réparation ou pièces.',
  },
});

/** Clothes, shoes and bags: the condition scale buyers know from Vinted and eBay fashion. */
export const FASHION_CONDITION_LABEL: ConditionMap = tr<ConditionMap>({
  en: { new: 'New with tags', like_new: 'New without tags', very_good: 'Very good', good: 'Good', fair: 'Satisfactory', poor: 'Worn', for_parts: 'Damaged' },
  de: { new: 'Neu mit Etikett', like_new: 'Neu ohne Etikett', very_good: 'Sehr gut', good: 'Gut', fair: 'Zufriedenstellend', poor: 'Stark getragen', for_parts: 'Beschädigt' },
  it: { new: 'Nuovo con cartellino', like_new: 'Nuovo senza cartellino', very_good: 'Ottime condizioni', good: 'Buone condizioni', fair: 'Discrete condizioni', poor: 'Molto usato', for_parts: 'Danneggiato' },
  fr: { new: 'Neuf avec étiquette', like_new: 'Neuf sans étiquette', very_good: 'Très bon état', good: 'Bon état', fair: 'Satisfaisant', poor: 'Très porté', for_parts: 'Abîmé' },
});

export const FASHION_CONDITION_HINT: ConditionMap = tr<ConditionMap>({
  en: {
    new: 'Never worn, original tags still attached.',
    like_new: 'Never worn, tags removed.',
    very_good: 'Worn a few times, no flaws.',
    good: 'Worn, light signs of wear such as slight fading or pilling.',
    fair: 'Clearly worn: fading, pilling or small flaws.',
    poor: 'Heavily worn, visible flaws such as stains or holes.',
    for_parts: 'Damaged: tears, broken zip, large stains.',
  },
  de: {
    new: 'Nie getragen, Originaletikett noch dran.',
    like_new: 'Nie getragen, Etikett entfernt.',
    very_good: 'Ein paar Mal getragen, keine Mängel.',
    good: 'Getragen, leichte Gebrauchsspuren wie etwas verblasst oder Knötchen.',
    fair: 'Deutlich getragen: verblasst, Knötchen oder kleine Mängel.',
    poor: 'Stark getragen, sichtbare Mängel wie Flecken oder Löcher.',
    for_parts: 'Beschädigt: Risse, kaputter Reißverschluss, große Flecken.',
  },
  it: {
    new: 'Mai indossato, con il cartellino originale.',
    like_new: 'Mai indossato, cartellino tolto.',
    very_good: 'Indossato poche volte, senza difetti.',
    good: 'Indossato, lievi segni d’uso come colore un po’ sbiadito o pallini.',
    fair: 'Chiaramente usato: sbiadito, pallini o piccoli difetti.',
    poor: 'Molto usato, difetti visibili come macchie o buchi.',
    for_parts: 'Danneggiato: strappi, zip rotta, grandi macchie.',
  },
  fr: {
    new: 'Jamais porté, étiquette d’origine encore attachée.',
    like_new: 'Jamais porté, étiquette retirée.',
    very_good: 'Porté quelques fois, sans défaut.',
    good: 'Porté, légères traces d’usure comme un peu décoloré ou bouloché.',
    fair: 'Clairement porté : décoloré, bouloché ou petits défauts.',
    poor: 'Très porté, défauts visibles comme des taches ou des trous.',
    for_parts: 'Abîmé : déchirures, fermeture cassée, grosses taches.',
  },
});

/** Condition label in the scale that fits the item (fashion or devices). */
export const conditionLabelFor = (c: Condition, category: CategorySlug | ''): string =>
  (category !== '' && isFashion(category) ? FASHION_CONDITION_LABEL : CONDITION_LABEL)[c];

type DecisionMap = { strong_buy: string; buy: string; borderline: string; skip: string };

export const DECISION_LABEL: DecisionMap = tr<DecisionMap>({
  en: { strong_buy: 'STRONG BUY', buy: 'BUY', borderline: 'BORDERLINE', skip: 'SKIP' },
  de: { strong_buy: 'KLARER KAUF', buy: 'KAUFEN', borderline: 'GRENZWERTIG', skip: 'FINGER WEG' },
  it: { strong_buy: 'OTTIMO AFFARE', buy: 'COMPRA', borderline: 'AL LIMITE', skip: 'LASCIA STARE' },
  fr: { strong_buy: 'EXCELLENTE AFFAIRE', buy: 'ACHETER', borderline: 'LIMITE', skip: 'PASSE TON CHEMIN' },
});

export const REASON_LABEL: Record<string, string> = tr<Record<string, string>>({
  en: {
    wrong_variant: 'Wrong variant',
    model_not_found: 'Model not in title',
    accessory_only: 'Accessory',
    box_only: 'Box only',
    for_parts: 'For parts / broken',
    bundle: 'Bundle',
    auction_unknown_final: 'Auction (no final price)',
    duplicate: 'Duplicate',
    outlier_low: 'Outlier (low)',
    outlier_high: 'Outlier (high)',
    suspected_scam: 'Suspected scam',
    stale: 'Too old',
    condition_mismatch: 'Condition too different',
    seller_cap: 'Same seller (max 3)',
    currency_unknown: 'Unknown currency',
  },
  de: {
    wrong_variant: 'Falsche Variante',
    model_not_found: 'Modell nicht im Titel',
    accessory_only: 'Zubehör',
    box_only: 'Nur Verpackung',
    for_parts: 'Defekt / für Bastler',
    bundle: 'Bundle',
    auction_unknown_final: 'Auktion (kein Endpreis)',
    duplicate: 'Duplikat',
    outlier_low: 'Ausreißer (niedrig)',
    outlier_high: 'Ausreißer (hoch)',
    suspected_scam: 'Verdacht auf Betrug',
    stale: 'Zu alt',
    condition_mismatch: 'Zustand zu verschieden',
    seller_cap: 'Gleicher Verkäufer (max. 3)',
    currency_unknown: 'Unbekannte Währung',
  },
  it: {
    wrong_variant: 'Variante sbagliata',
    model_not_found: 'Modello non nel titolo',
    accessory_only: 'Accessorio',
    box_only: 'Solo scatola',
    for_parts: 'Per pezzi di ricambio / guasto',
    bundle: 'Bundle',
    auction_unknown_final: 'Asta (nessun prezzo finale)',
    duplicate: 'Duplicato',
    outlier_low: 'Anomalo (basso)',
    outlier_high: 'Anomalo (alto)',
    suspected_scam: 'Sospetta truffa',
    stale: 'Troppo vecchio',
    condition_mismatch: 'Condizione troppo diversa',
    seller_cap: 'Stesso venditore (max 3)',
    currency_unknown: 'Valuta sconosciuta',
  },
  fr: {
    wrong_variant: 'Mauvaise variante',
    model_not_found: 'Modèle absent du titre',
    accessory_only: 'Accessoire',
    box_only: 'Boîte seule',
    for_parts: 'Pour pièces / en panne',
    bundle: 'Lot',
    auction_unknown_final: 'Enchère (pas de prix final)',
    duplicate: 'Doublon',
    outlier_low: 'Valeur aberrante (basse)',
    outlier_high: 'Valeur aberrante (haute)',
    suspected_scam: 'Arnaque suspectée',
    stale: 'Trop ancien',
    condition_mismatch: 'État trop différent',
    seller_cap: 'Même vendeur (max 3)',
    currency_unknown: 'Devise inconnue',
  },
});

export const FACTOR_LABEL: Record<string, string> = tr<Record<string, string>>({
  en: {
    identification: 'Identification',
    comparable_count: 'Comparable count',
    similarity: 'Match quality',
    freshness: 'Data freshness',
    data_kind: 'Sold vs asking',
    spread: 'Price spread',
  },
  de: {
    identification: 'Erkennung',
    comparable_count: 'Anzahl Vergleichsangebote',
    similarity: 'Übereinstimmung',
    freshness: 'Aktualität der Daten',
    data_kind: 'Verkauft vs. angeboten',
    spread: 'Preisspanne',
  },
  it: {
    identification: 'Riconoscimento',
    comparable_count: 'Numero di annunci comparabili',
    similarity: 'Corrispondenza',
    freshness: 'Aggiornamento dei dati',
    data_kind: 'Venduti vs in vendita',
    spread: 'Forbice di prezzo',
  },
  fr: {
    identification: 'Identification',
    comparable_count: 'Nombre d’annonces comparables',
    similarity: 'Correspondance',
    freshness: 'Fraîcheur des données',
    data_kind: 'Vendus vs en vente',
    spread: 'Écart de prix',
  },
});

const PILL = tr({
  en: { noData: 'NO DATA', max: (p: string) => `MAX ${p}` },
  de: { noData: 'KEINE DATEN', max: (p: string) => `MAX. ${p}` },
  it: { noData: 'NESSUN DATO', max: (p: string) => `MAX ${p}` },
  fr: { noData: 'AUCUNE DONNÉE', max: (p: string) => `MAX ${p}` },
});

/** Pill for a saved check. Checked without a price: the useful answer is the max buy price, not a verdict. */
export function scanPill(s: { priceProvided?: boolean; purchasePrice: { amountMinor: number }; valuation: { decision: string | null } | null }): { cls: string; label: string } {
  if (!s.valuation?.decision) return { cls: 'd-insufficient', label: PILL.noData };
  if (s.priceProvided === false) return { cls: 'd-value', label: PILL.max(money(Math.round(s.purchasePrice.amountMinor / 100) * 100)) };
  return { cls: `d-${s.valuation.decision}`, label: DECISION_LABEL[s.valuation.decision as keyof DecisionMap] ?? s.valuation.decision };
}
