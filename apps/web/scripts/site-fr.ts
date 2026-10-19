/**
 * French language pack of the static site (published under /fr). Same base paths as the English PAGES in site.ts.
 * Links inside point to French pages; /privacy and /terms stay unprefixed.
 */
import { PLANS, REFERRAL } from '@fliplens/core';
import { LEGAL } from '../src/legal.js';
import { PLAN_FEATURES_BY_LANG } from '../src/i18n.js';
import { EXAMPLE_PEOPLE, INVITE_BONUS_CHECKS, esc, eurIn, exampleMinor, href, numIn, type Faq, type LangPack, type Page, type UiStrings } from './site-common.js';

const eur = (minor: number): string => eurIn('fr', minor);
const num = (n: number): string => numIn('fr', n);
const h = (path: string): string => href('fr', path);

const plans = Object.values(PLANS);
const paid = plans.filter((p) => p.priceMonthlyMinor > 0);

/** French plan feature lines (keep in step with apps/web/src/i18n.ts). */
const FR_FEATURES: Record<string, readonly string[]> = PLAN_FEATURES_BY_LANG.fr;

const CTA = `<p class="cta"><a class="btn" href="/fr">Vérifier gratuitement</a><span>${PLANS.free.monthlyValuations} vérifications gratuites par mois. Tu peux tester une vérification sans compte. Pas de carte bancaire.</span></p>`;
const LISTING_CTA = `<p class="cta"><a class="btn" href="/fr?tool=listing">Écrire mon annonce gratuitement</a><span>${PLANS.free.monthlyListings} annonces gratuites par mois. Tu peux en tester une sans compte. Pas de carte bancaire.</span></p>`;

const COMMON_FAQ: Faq[] = [
  {
    q: `Qu'est-ce que FlipLens?`,
    a: `FlipLens est une application web pour les revendeurs en Europe. Prends une photo, scanne un code-barres ou tape un modèle: FlipLens te dit à quel prix l'article se revend sur eBay en Allemagne, en France, en Italie, en Espagne et aux Pays-Bas, ou sur eBay.co.uk au Royaume-Uni, ton bénéfice après frais et livraison, le prix maximum à payer et un verdict: Excellente affaire, Acheter, Limite ou Passe ton chemin.`,
  },
  {
    q: `D'où viennent les prix?`,
    a: `Des annonces eBay actives, lues via l'API officielle d'eBay: dans cinq pays de l'UE, avec des prix convertis en euros aux taux de change de la BCE, ou sur eBay.co.uk, en livres sterling, si tu vends au Royaume-Uni. Les prix demandés sont en général plus élevés que les prix de vente finaux, donc FlipLens les ajuste à la baisse et indique toujours sur combien d'annonces repose une estimation. Tu peux ouvrir chaque annonce utilisée.`,
  },
  {
    q: `Quels articles fonctionnent le mieux?`,
    a: `L'électronique grand public, le gaming et la photo: casques et écouteurs, smartphones, tablettes, ordinateurs portables, montres connectées, enceintes, consoles, consoles portables, manettes, jeux, boîtiers photo, objectifs, caméras d'action et compacts, ainsi que l'outillage électrique. La mode n'est pas encore prise en charge.`,
  },
  {
    q: `Dois-je saisir un prix?`,
    a: `Non. Sans prix, FlipLens montre à combien l'article se vend et le prix maximum à payer pour atteindre ta rentabilité cible. Avec un prix, tu obtiens un verdict, le bénéfice et le ROI pour cette affaire précise.`,
  },
  {
    q: `Que deviennent mes photos et mes données?`,
    a: `Les photos servent uniquement à identifier l'article et ne sont jamais enregistrées. Tes vérifications sont conservées jusqu'à ce que tu les supprimes, et tu peux tout exporter ou supprimer depuis ton profil à tout moment.`,
  },
  {
    q: `FlipLens est-il lié à eBay?`,
    a: `Non. FlipLens est indépendant et affiche les données eBay via l'API officielle d'eBay. FlipLens n'achète, ne vend et n'expédie rien.`,
  },
];

const PAGES: Page[] = [
  {
    path: '/how-it-works',
    kind: 'page',
    crumb: 'Comment ça marche',
    title: `Comment FlipLens estime la valeur de revente et le bénéfice`,
    description: `Comment FlipLens identifie le produit exact, trouve des annonces eBay comparables dans cinq pays de l'UE ou au Royaume-Uni, estime la valeur de revente, déduit les frais et la livraison, et décide entre Excellente affaire, Acheter, Limite et Passe ton chemin.`,
    h1: 'Comment fonctionne FlipLens',
    lead: `FlipLens répond à une seule question: « Je peux acheter ça X €. Est-ce que ça vaut le coup pour le revendre? » Voici exactement comment la réponse est construite, y compris là où elle peut se tromper.`,
    sections: [
      {
        h2: '1. Identifier le produit exact',
        html: `<p>Tu prends en photo l'article ou son étiquette, tu scannes le code-barres sur la boîte ou tu tapes le modèle. Les photos sont identifiées par un modèle de vision IA; les codes-barres (EAN et UPC) sont comparés aux annonces des plateformes. FlipLens cherche les détails qui changent le prix: la génération du modèle (un WH-1000XM4 n'est pas un XM5), le stockage (128 Go n'est pas 256 Go), la monture d'objectif (RF n'est pas EF) et l'état. Tu peux tout corriger avant de lancer la vérification.</p>`,
      },
      {
        h2: '2. Trouver des annonces comparables',
        html: `<p>FlipLens cherche les annonces eBay actuelles en Allemagne, en France, en Italie, en Espagne et aux Pays-Bas via l'API officielle d'eBay et convertit les prix en euros avec les taux de la Banque centrale européenne. Si tu vends sur eBay.co.uk, il utilise les annonces d'eBay.co.uk et affiche les prix en livres sterling. Il écarte ensuite ce qui fausserait le prix: autres modèles et variantes, accessoires vendus seuls, lots, articles en panne ou « pour pièces », doublons et annonces dans un état très différent. Tu vois chaque annonce utilisée et pourquoi les autres ont été écartées. Sur l'écran du résultat, la comparaison « UK vs UE » montre en un appui l'article sur eBay.co.uk et sur les cinq sites de l'UE côte à côte, en livres et en euros, sans utiliser de vérification.</p>`,
      },
      {
        h2: '3. Estimer la valeur de revente',
        html: `<p>À partir des annonces restantes, FlipLens construit une distribution de prix ajustée à l'état de ton article et donne trois chiffres: un prix de vente rapide, le prix de vente attendu et un prix demandé élevé. Comme les prix demandés sont en général supérieurs aux prix de vente finaux, l'estimation est ajustée à la baisse. Chaque estimation a un indice de confiance basé sur le nombre d'annonces correspondantes, leur cohérence et la qualité de l'identification du produit.</p>`,
      },
      {
        h2: '4. Calculer le bénéfice après frais',
        html: `<p>FlipLens déduit les frais de vente de la plateforme où tu vends (par exemple eBay.de particulier ou professionnel, eBay.co.uk particulier, Vinted ou la remise en main propre), tes frais de livraison et le prix d'achat. Résultat: le bénéfice, le retour sur investissement (ROI) et le <strong>prix maximum</strong> à payer pour ton ROI cible: prix maximum = ce qu'il te reste après frais et livraison ÷ (1 + ROI cible).</p>`,
      },
      {
        h2: `5. Donner un verdict, ou dire qu'il ne sait pas`,
        html: `<p>Le verdict est Excellente affaire, Acheter, Limite ou Passe ton chemin, avec les raisons et les risques. S'il reste moins de cinq annonces correspondantes, ou si l'identification du produit est trop incertaine, FlipLens affiche « pas assez de données de marché » au lieu d'inventer un chiffre.</p>`,
      },
      {
        h2: 'Limites connues',
        html: `<ul><li>Les prix reposent sur des annonces actives (prix demandés), pas sur des prix de vente confirmés.</li><li>L'offre est visible (combien d'articles sont en vente et depuis combien de temps), la vitesse de vente pas encore.</li><li>La mode, les objets de collection et les pièces uniques ne sont pas pris en charge.</li><li>Les frais changent: chaque profil de frais indique quand il a été vérifié pour la dernière fois et renvoie vers sa source.</li></ul>`,
      },
    ],
  },
  {
    path: '/pricing',
    kind: 'page',
    crumb: 'Tarifs',
    title: `Tarifs FlipLens: vérifications gratuites, Pro ${eur(PLANS.pro.priceMonthlyMinor)}, Reseller ${eur(PLANS.reseller.priceMonthlyMinor)}`,
    description: `Free: ${PLANS.free.monthlyValuations} vérifications par mois. Pro ${eur(PLANS.pro.priceMonthlyMinor)}: ${PLANS.pro.monthlyValuations} vérifications et un générateur d'annonces. Reseller ${eur(PLANS.reseller.priceMonthlyMinor)}: jusqu'à ${num(PLANS.reseller.monthlyValuations)} vérifications. Prix TTC, sans engagement.`,
    h1: 'Des tarifs simples',
    lead: `Commence gratuitement. Passe à un forfait payant quand FlipLens est rentabilisé: une bonne trouvaille couvre en général un mois entier.`,
    sections: [
      {
        h2: 'Forfaits',
        html: `<table><thead><tr><th>Forfait</th><th>Prix</th><th>Inclus</th></tr></thead><tbody>${plans
          .map((p) => `<tr><td><strong>${esc(p.name)}</strong></td><td>${p.priceMonthlyMinor ? `${eur(p.priceMonthlyMinor)} / mois` : 'Gratuit'}</td><td>${(FR_FEATURES[p.id] ?? []).map(esc).join('<br>')}</td></tr>`)
          .join('')}</tbody></table><p>Prix TTC, sans frais cachés. Les paiements passent par Stripe. Tu peux résilier à tout moment depuis le portail client. Les consommateurs de l'UE disposent d'un droit de rétractation de 14 jours, voir les <a href="/terms">Conditions d'utilisation</a>.</p>`,
      },
      {
        h2: 'Ce qui compte comme une vérification',
        html: `<p>Une vérification correspond à une estimation: FlipLens analyse le marché (eBay dans cinq pays de l'UE, en euros, ou eBay.co.uk, en livres sterling) et calcule la valeur de revente, le bénéfice et un verdict. La reconnaissance de l'article par photo ou code-barres est incluse. La comparaison « UK vs UE » sur l'écran du résultat n'utilise pas de vérification. Les vérifications sont remises à zéro le 1er de chaque mois.</p>`,
      },
    ],
    faq: [
      { q: 'Y a-t-il un forfait gratuit?', a: `Oui. ${PLANS.free.name} inclut ${PLANS.free.monthlyValuations} vérifications par mois avec reconnaissance par photo et code-barres, bénéfice et ROI, suivi du stock et ${PLANS.free.monthlyListings} annonces IA. Pas de carte bancaire.` },
      { q: `Qu'apportent les forfaits payants?`, a: paid.map((p) => `${p.name} (${eur(p.priceMonthlyMinor)}/mois): ${(FR_FEATURES[p.id] ?? []).join(', ')}.`).join(' ') },
      { q: 'Puis-je résilier à tout moment?', a: `Oui. Résilie dans le portail client depuis ton profil; le forfait reste actif jusqu'à la fin du mois payé.` },
    ],
  },
  {
    path: '/faq',
    kind: 'page',
    crumb: 'FAQ',
    title: `FAQ FlipLens: vérifier la valeur de revente pour les revendeurs en Europe`,
    description: `Réponses sur FlipLens: d'où viennent les prix, quels articles et pays (UE et Royaume-Uni) sont couverts, précision, confidentialité, tarifs et installation de l'application.`,
    h1: 'Questions fréquentes',
    lead: `Des réponses courtes sur le fonctionnement de FlipLens, ce qu'il sait faire et ce qu'il ne fait pas.`,
    sections: [],
    faq: [
      ...COMMON_FAQ,
      { q: 'FlipLens peut-il vérifier toute une table en une fois?', a: `Oui. Prends une seule photo d'un stand, d'un carton ou d'une étagère: FlipLens trouve jusqu'à 6 articles, vérifie chacun avec de vraies annonces eBay (une vérification par article) et affiche les meilleures affaires en premier. C'est le Scan de la table. Ou garde la caméra ouverte avec le Radar en direct: les articles reçoivent un cadre avec leur nom pendant que tu bouges, et un appui vérifie le prix. Les prix viennent toujours d'une vraie vérification, jamais d'une supposition. Les deux nécessitent une connexion Google.` },
      { q: 'Quels pays FlipLens couvre-t-il?', a: `Les données de marché viennent d'eBay Allemagne, France, Italie, Espagne et Pays-Bas, en euros. Si tu vends sur eBay.co.uk (le choix par défaut quand ton pays est le Royaume-Uni), FlipLens utilise les annonces d'eBay.co.uk et affiche les prix en livres sterling, avec les frais des vendeurs particuliers au Royaume-Uni. Dans ton profil, tu peux choisir eBay.de ou eBay.co.uk quel que soit ton pays. Sur l'écran du résultat, la comparaison « UK vs UE » montre en un appui le même article sur eBay.co.uk et sur les cinq sites de l'UE côte à côte, en livres et en euros, sans utiliser de vérification. Des liens pour vérifier les prix toi-même sont disponibles pour Vinted, Kleinanzeigen et d'autres plateformes.` },
      { q: `L'estimation est-elle précise?`, a: `Ça dépend du marché. Chaque résultat affiche un indice de confiance, le nombre d'annonces sur lequel il repose et les risques. Quand il n'y a pas assez de données, FlipLens le dit au lieu de deviner. Tu peux noter tes vrais prix de vente dans le Stock et voir à quel point les estimations étaient justes.` },
      { q: 'Pour quelles plateformes les frais sont-ils calculés?', a: `eBay.de pour les vendeurs particuliers et professionnels, eBay.co.uk pour les vendeurs particuliers, Vinted et la remise en main propre contre espèces. Chaque profil de frais indique quand il a été vérifié pour la dernière fois.` },
      { q: 'FlipLens peut-il écrire mon annonce?', a: `Oui. Prends en photo n'importe quel article, vêtements compris, et FlipLens écrit un titre, une description et un texte sur l'état dans le style de Vinted, eBay ou Kleinanzeigen, dans ta langue, prêts à copier. Free inclut ${PLANS.free.monthlyListings} annonces par mois, Pro ${PLANS.pro.monthlyListings}. FlipLens ne publie jamais rien à ta place.` },
      { q: 'Y a-t-il une application mobile?', a: `FlipLens est une application web qui s'installe sur ton téléphone: ouvre fliplens.eu et choisis « Sur l'écran d'accueil » (iPhone) ou « Installer l'application » (Android). Elle s'ouvre ensuite en plein écran comme une application native.` },
      { q: 'Pourquoi dois-je me connecter?', a: `Tes vérifications gratuites, ton historique et ton forfait sont liés à ton compte, ils fonctionnent donc sur tous tes appareils. La connexion avec Google se fait en un appui, sans mot de passe à créer.` },
    ],
  },
  {
    path: '/guides/how-to-check-resale-value',
    kind: 'article',
    crumb: 'Vérifier la valeur de revente',
    parent: { path: '/guides', name: 'Guides' },
    title: `Comment vérifier la valeur de revente d'un article avant de l'acheter (Europe)`,
    description: `Une méthode étape par étape pour savoir à quel prix un article d'occasion se revend vraiment en Europe, déduire les frais et la livraison, et calculer le prix maximum à payer.`,
    h1: `Comment vérifier la valeur de revente d'un article avant de l'acheter`,
    lead: `Dans une brocante ou sur un site de petites annonces, tu as en général une minute pour te décider. Voici la méthode des revendeurs, celle que FlipLens automatise.`,
    sections: [
      {
        h2: '1. Identifier le modèle exact',
        html: `<p>Les écarts de prix entre variantes sont souvent plus grands qu'entre états. Lis la référence du modèle sur l'étiquette, la boîte ou dans les réglages. Vérifie la capacité de stockage, la génération du modèle, la couleur quand elle compte et, pour les objectifs, la monture. « Casque Sony » n'est pas un prix; « Sony WH-1000XM4 », si.</p>`,
      },
      {
        h2: '2. Regarder des annonces comparables, pas le premier résultat',
        html: `<p>Cherche le modèle exact sur eBay et écarte ce qui n'est pas comparable: autres générations, accessoires vendus seuls, lots avec jeux ou objectifs en plus, articles « pour pièces » et annonces lointaines avec une livraison chère. Regarde plusieurs pays: le même article peut se vendre à des prix nettement différents en Allemagne, en France ou en Italie.</p>`,
      },
      {
        h2: `3. Corriger selon le prix demandé et l'état`,
        html: `<p>La plupart des annonces affichent des prix demandés, et les articles se vendent en général moins cher. Prends le milieu de la fourchette réaliste, pas l'annonce la plus chère, et tiens compte de l'état: un article en « bon état » ne se vend pas au prix d'un « comme neuf ». S'il n'existe qu'une poignée d'annonces comparables, prends toute estimation avec prudence.</p>`,
      },
      {
        h2: '4. Déduire les frais et la livraison',
        html: `<p>Ce qu'il te reste, c'est le prix de vente moins les frais de la plateforme et la livraison que tu paies. Sur eBay.de, les vendeurs particuliers ne paient pas de frais de vente pour les ventes en Allemagne, les professionnels si; sur Vinted, c'est l'acheteur qui paie les frais. Voir <a href="${h('/guides/ebay-fees-germany')}">les frais eBay.de pour les vendeurs particuliers et professionnels</a> et <a href="${h('/guides/where-to-sell-used-electronics-europe')}">où vendre de l'électronique d'occasion en Europe</a>.</p>`,
      },
      {
        h2: '5. Calculer ton prix maximum',
        html: `<p>Fixe la rentabilité que tu veux, puis divise ce qu'il te reste par 1 plus cette rentabilité. Exemple: une Nintendo Switch OLED devrait se vendre 176 €, sans frais de vente, avec 6 € de livraison, il te reste donc 170 €. Pour une rentabilité de 40 %, le maximum à payer est 170 € ÷ 1,4 = <strong>121 €</strong>. En dessous, c'est un achat; au-dessus, négocie ou passe ton chemin.</p>`,
      },
      {
        h2: 'En quelques secondes avec FlipLens',
        html: `<p>FlipLens fait les cinq étapes à partir d'une photo, d'un code-barres ou d'un modèle tapé: il identifie la variante exacte, lit les annonces eBay comparables dans cinq pays de l'UE ou sur eBay.co.uk, tient compte de l'état et des prix demandés, déduit les frais de ta plateforme et la livraison, et affiche le prix maximum. Tu n'as même pas besoin de connaître le prix du vendeur.</p>`,
      },
    ],
    faq: [
      { q: 'Comment savoir à quel prix un article se revendra?', a: `Identifie le modèle exact, compare-le à des annonces similaires dans le même état, prends le milieu réaliste de la fourchette plutôt que le prix demandé le plus haut, puis déduis les frais de vente et la livraison.` },
      { q: 'Combien payer un article que je veux revendre?', a: `Divise ce qu'il te restera après frais et livraison par 1 plus ta rentabilité cible. Pour 170 € restants et un objectif de 40 %, paie au maximum 121 €.` },
    ],
  },
  {
    path: '/guides/ebay-fees-germany',
    kind: 'article',
    crumb: 'Frais eBay.de',
    parent: { path: '/guides', name: 'Guides' },
    title: 'Frais eBay.de en 2026: vendeurs particuliers et professionnels',
    description: `Ce que coûte la vente sur eBay Allemagne pour les vendeurs particuliers et professionnels, avec un exemple de l'effet des frais sur ton bénéfice et sur le prix que tu peux payer ton stock.`,
    h1: 'Frais eBay.de en 2026: particuliers et professionnels',
    lead: `Vendre en tant que particulier ou en tant que professionnel change ta marge sur chaque article. Voici la différence et comment en tenir compte. Vérifie toujours les frais actuels sur les pages d'eBay avant de t'y fier.`,
    sections: [
      {
        h2: 'Vendeurs particuliers',
        html: `<p>Depuis le 1er mars 2023, les vendeurs particuliers sur eBay.de ne paient <strong>aucun frais de vente</strong> pour les ventes en Allemagne. Les options payantes, comme certaines mises en avant d'annonces et la vente à l'international, peuvent toujours coûter de l'argent. Source: <a href="https://www.ebay.de/help/selling/fees-credits-invoices/gebhren-fr-private-verkufer-die-der-zahlungsabwicklung-teilnehmen?id=4822">aide eBay.de: frais pour les vendeurs particuliers</a>.</p>`,
      },
      {
        h2: 'Vendeurs professionnels',
        html: `<p>Les vendeurs professionnels paient une commission sur le prix de vente final, qui dépend de la catégorie et de l'état de l'article, neuf ou d'occasion. Lors de notre dernière vérification (septembre 2026), les taux pour les catégories couvertes par FlipLens étaient environ de:</p><table><thead><tr><th>Article</th><th>Frais</th></tr></thead><tbody><tr><td>Électronique d'occasion ou reconditionnée</td><td>5 %</td></tr><tr><td>Électronique neuve</td><td>7 %</td></tr><tr><td>Accessoires</td><td>12 %</td></tr><tr><td>Outillage</td><td>13 %</td></tr><tr><td>Par commande de plus de 10 €</td><td>+ 0,45 €</td></tr></tbody></table><p>Ces chiffres viennent d'une source secondaire et les catégories ont des exceptions, alors vérifie le barème actuel d'eBay pour ta catégorie.</p>`,
      },
      {
        h2: 'Exemple: le même article, deux types de vendeur',
        html: `<p>Une Nintendo Switch OLED d'occasion se vend 176 € et tu paies 6 € de livraison.</p><ul><li>Vendeur particulier: pas de frais de vente, il te reste 170 €. Pour une rentabilité de 40 %, tu peux payer jusqu'à 121 €.</li><li>Vendeur professionnel: environ 5 % (8,80 €) plus 0,45 €, il te reste environ 160,75 €. Pour une rentabilité de 40 %, tu peux payer jusqu'à environ 114 €.</li></ul><p>Quelques euros de différence par article finissent par compter sur un mois d'achats, alors règle correctement ton type de vendeur dans FlipLens: chaque vérification utilise ensuite les bons frais.</p>`,
      },
      {
        h2: 'Particulier ou professionnel: lequel suis-je?',
        html: `<p>Si tu achètes des articles dans le but de les revendre régulièrement, le droit fiscal et le droit de la consommation considèrent en général cela comme une activité professionnelle, même si tu as commencé en dilettante. Ceci est une information générale, pas un conseil juridique ou fiscal: vérifie les règles de ton pays ou demande à un comptable.</p>`,
      },
    ],
    faq: [
      { q: 'Les vendeurs particuliers paient-ils des frais sur eBay.de?', a: `Aucun frais de vente pour les ventes en Allemagne depuis le 1er mars 2023. Les options payantes et la vente à l'international peuvent coûter de l'argent.` },
      { q: 'Que paient les vendeurs professionnels sur eBay.de?', a: `Une commission sur le prix final selon la catégorie et l'état; en septembre 2026, environ 5 % pour l'électronique d'occasion et 7 % pour le neuf, plus 0,45 € par commande de plus de 10 €. Vérifie le barème actuel d'eBay.` },
    ],
  },
  {
    path: '/guides/where-to-sell-used-electronics-europe',
    kind: 'article',
    crumb: `Où vendre de l'électronique`,
    parent: { path: '/guides', name: 'Guides' },
    title: `Où vendre de l'électronique d'occasion en Europe: eBay, Vinted, Kleinanzeigen ou en local`,
    description: `eBay, Vinted, Kleinanzeigen et la vente en espèces en local comparés pour l'électronique d'occasion en Europe: qui paie les frais, audience, rapidité et quand chacun a du sens.`,
    h1: `Où vendre de l'électronique d'occasion en Europe`,
    lead: `La meilleure plateforme dépend de l'article, de la vitesse à laquelle tu veux vendre et de qui paie les frais. Une comparaison rapide pour les revendeurs en Europe.`,
    sections: [
      {
        h2: 'eBay: la plus large audience',
        html: `<p>eBay a des sites nationaux dans toute l'Europe (Allemagne, France, Italie, Espagne, Pays-Bas, Royaume-Uni et d'autres) et des acheteurs qui cherchent par modèle exact. Il convient aux articles avec une référence claire: consoles, téléphones, casques, appareils photo et objectifs. Les vendeurs particuliers en Allemagne ne paient pas de frais de vente pour les ventes en Allemagne; les professionnels paient des frais selon la catégorie. Voir <a href="${h('/guides/ebay-fees-germany')}">les frais eBay.de</a>.</p>`,
      },
      {
        h2: 'Vinted: pas de frais pour le vendeur',
        html: `<p>Sur Vinted, le vendeur ne paie pas de frais: l'acheteur paie des frais de Protection acheteurs et la livraison en plus. Ton prix paraît donc plus élevé pour l'acheteur, et il faut parfois afficher un peu moins cher. Ça marche bien pour l'électronique et le gaming de petite taille, faciles à expédier.</p>`,
      },
      {
        h2: 'Kleinanzeigen: le local en Allemagne',
        html: `<p>Kleinanzeigen est le grand site de petites annonces en Allemagne. Les annonces de base sont gratuites pour les particuliers, beaucoup d'acheteurs préfèrent venir chercher l'article et s'attendent à négocier, alors commence un peu au-dessus de ton prix cible. Idéal pour les articles encombrants ou lourds, quand la livraison mangerait la marge.</p>`,
      },
      {
        h2: 'Remise en main propre et espèces',
        html: `<p>Pas de frais et pas de livraison, mais moins d'acheteurs et des ventes plus lentes. Intéressant pour les gros articles ou quand tu as déjà un acheteur.</p>`,
      },
      {
        h2: `Comparer avant d'acheter`,
        html: `<p>Choisis dans FlipLens la plateforme où tu vends d'habitude, et chaque vérification utilise ses frais et ses règles de livraison. Le résultat renvoie aussi vers Vinted, Kleinanzeigen et d'autres plateformes pour que tu voies toi-même les prix locaux.</p>`,
      },
    ],
    faq: [
      { q: `Vaut-il mieux vendre de l'électronique sur eBay ou sur Vinted?`, a: `eBay touche plus d'acheteurs qui cherchent un modèle exact et convient aux articles de plus grande valeur; sur Vinted, le vendeur ne paie pas de frais car l'acheteur paie la Protection acheteurs, ce qui marche bien pour les petits articles. Compare ce qu'il te reste après frais et livraison.` },
      { q: 'Qui paie les frais sur Vinted?', a: `L'acheteur. Vinted facture à l'acheteur des frais de Protection acheteurs et la livraison; le vendeur reçoit le prix affiché.` },
    ],
  },
  {
    path: '/guides/flea-market-reselling-checklist',
    kind: 'article',
    crumb: 'Checklist brocante',
    parent: { path: '/guides', name: 'Guides' },
    title: `Checklist brocante pour revendeurs: quoi vérifier avant d'acheter de l'électronique`,
    description: `Une checklist pratique pour acheter de l'électronique, des consoles et des appareils photo d'occasion en brocante ou en vide-grenier pour les revendre: identification, test, accessoires, verrouillages et prix.`,
    h1: 'Checklist brocante pour revendeurs',
    lead: `La plupart des mauvais achats ne sont pas trop chers: c'est la mauvaise variante, il manque quelque chose ou l'appareil est verrouillé. Passe cette liste en revue avant de sortir ton argent.`,
    sections: [
      {
        h2: 'Avant de partir',
        html: `<ul><li>Charge ton téléphone et emporte une batterie externe: tu vas vérifier les prix sur place.</li><li>Prends des petites coupures et de la monnaie, les vendeurs ont rarement de quoi rendre tôt le matin.</li><li>Connais ton prix maximum par type d'article, ou vérifie-le en quelques secondes avec FlipLens.</li></ul>`,
      },
      {
        h2: `Identifier l'article exact`,
        html: `<ul><li>Trouve la référence du modèle sur l'étiquette, dans le compartiment à piles ou sur la boîte. Prends-la en photo.</li><li>Vérifie la capacité de stockage, la génération et, pour les objectifs, la monture.</li><li>Les codes-barres sur les boîtes identifient la variante exacte le plus vite.</li></ul>`,
      },
      {
        h2: `Tester ce qui peut l'être`,
        html: `<ul><li>Est-ce que ça s'allume? Demande une prise ou apporte une batterie externe et un câble.</li><li>Écrans: pixels morts, marquage, fissures. Ports: les ports de charge qui bougent sont fréquents.</li><li>Manettes et Joy-Con: vérifie le drift des sticks.</li><li>Appareils photo et objectifs: regarde à travers l'objectif face à la lumière pour repérer voile, champignons et rayures; vérifie que l'obturateur se déclenche.</li><li>Téléphones et tablettes: vérifie l'état de la batterie dans les réglages si possible.</li></ul>`,
      },
      {
        h2: `Vérifier qu'il n'est pas verrouillé`,
        html: `<p>Téléphones, tablettes, ordinateurs portables et montres connectées peuvent être liés au compte de l'ancien propriétaire (par exemple le Verrouillage d'activation d'Apple). Un appareil verrouillé ne vaut qu'une fraction de son prix. Demande au vendeur de montrer qu'il est déconnecté ou de le réinitialiser devant toi.</p>`,
      },
      {
        h2: 'Un article complet vaut plus',
        html: `<p>La boîte d'origine, le chargeur, les câbles, les bouchons d'objectif et les notices aident tous à vendre plus vite et plus cher. Les chargeurs et câbles propriétaires manquants te coûtent de l'argent à remplacer.</p>`,
      },
      {
        h2: 'Décider sur les chiffres',
        html: `<p>Compare le prix demandé au prix maximum après frais et livraison. Si le vendeur est au-dessus, négocie jusqu'à ce prix ou passe ton chemin. Voir <a href="${h('/guides/how-to-check-resale-value')}">comment vérifier la valeur de revente</a>.</p>`,
      },
    ],
    faq: [
      { q: `Que vérifier avant d'acheter de l'électronique d'occasion pour la revendre?`, a: `Le modèle et la variante exacts, que l'appareil s'allume et fonctionne, l'état de l'écran et des ports, qu'il n'est pas lié au compte de quelqu'un d'autre, les accessoires inclus, et que le prix est sous ton maximum après frais et livraison.` },
    ],
  },
  {
    path: '/vinted-listing-generator',
    kind: 'page',
    crumb: `Générateur d'annonces Vinted`,
    cta: LISTING_CTA,
    title: `Générateur d'annonces Vinted: titre et description à partir d'une photo`,
    description: `Prends en photo tout ce que tu vends, vêtements compris, et obtiens un titre, une description et des hashtags Vinted dans ta langue. ${PLANS.free.monthlyListings} annonces gratuites par mois.`,
    h1: `Générateur d'annonces Vinted`,
    lead: `Prends l'article en photo et obtiens un titre, une description et des hashtags prêts à coller dans Vinted. Fonctionne pour les vêtements, chaussures, sacs, la maison, les jouets et la tech, dans ta langue.`,
    sections: [
      {
        h2: 'Comment ça marche',
        html: `<ol><li>Prends une à trois photos: l'avant, l'arrière et l'étiquette de marque ou de taille donnent les meilleurs résultats.</li><li>Choisis l'état et ajoute ce que les photos ne montrent pas, comme la taille, la matière ou un petit défaut.</li><li>Copie le titre et la description, ouvre Vinted et colle.</li></ol>`,
      },
      {
        h2: `Ce qu'il écrit`,
        html: `<p>Pour Vinted: un titre court et naturel (marque, article et un détail clé), une description sympathique et honnête, une phrase sur l'état et quelques mots-clés et hashtags pertinents. La même photo peut aussi devenir une annonce eBay (titre avec les mots-clés en premier, description structurée) ou une annonce Kleinanzeigen (directe, avec la mention habituelle de vente entre particuliers).</p>`,
      },
      {
        h2: 'Honnête par principe',
        html: `<p>Le générateur décrit uniquement ce qui est visible sur tes photos ou écrit dans tes précisions. Il n'invente ni taille, ni matière, ni marque, ni mesures. Quand il manque une information que les acheteurs demandent souvent, comme la taille ou les mesures, il te le signale pour que tu l'ajoutes avant de publier.</p>`,
      },
      {
        h2: 'Et le prix?',
        html: `<p>FlipLens ne lit pas les données de Vinted. Après avoir écrit ton annonce, il renvoie vers des articles similaires sur Vinted pour que tu compares les prix en un appui. Pour l'électronique, les jeux et la photo, FlipLens peut aussi <a href="${h('/how-it-works')}">estimer la valeur de revente</a> à partir des annonces eBay de cinq pays de l'UE ou d'eBay.co.uk.</p>`,
      },
      {
        h2: 'Forfaits',
        html: `<p>Free: ${PLANS.free.monthlyListings} annonces par mois. Pro (${eur(PLANS.pro.priceMonthlyMinor)}/mois): ${PLANS.pro.monthlyListings} annonces et ${PLANS.pro.monthlyValuations} vérifications de prix. Reseller (${eur(PLANS.reseller.priceMonthlyMinor)}/mois): jusqu'à ${num(PLANS.reseller.monthlyListings)}. Voir les <a href="${h('/pricing')}">tarifs</a>.</p>`,
      },
    ],
    faq: [
      { q: `Le générateur d'annonces Vinted est-il gratuit?`, a: `Oui, ${PLANS.free.monthlyListings} annonces par mois sont gratuites après connexion avec Google. Pro en inclut ${PLANS.pro.monthlyListings} par mois.` },
      { q: 'Dans quelles langues écrit-il?', a: `Anglais, allemand, français, italien, espagnol, néerlandais, polonais, slovène, croate, tchèque, portugais et suédois.` },
      { q: 'Publie-t-il sur Vinted à ma place?', a: `Non. Tu copies le texte et tu le colles toi-même dans Vinted. FlipLens est indépendant et n'est pas lié à Vinted.` },
      { q: 'Mes photos sont-elles enregistrées?', a: `Non. Les photos servent uniquement à écrire l'annonce et ne sont pas enregistrées.` },
    ],
  },
  {
    path: '/guides/how-to-sell-on-vinted',
    kind: 'article',
    crumb: 'Vendre sur Vinted',
    parent: { path: '/guides', name: 'Guides' },
    cta: LISTING_CTA,
    title: 'Comment vendre sur Vinted: frais, annonces qui vendent et prix',
    description: `Un guide pratique pour vendre sur Vinted en Europe: qui paie les frais, comment photographier et décrire tes articles, comment fixer les prix et comment expédier.`,
    h1: 'Comment vendre sur Vinted',
    lead: `Vinted est la plus grande plateforme de seconde main pour les vêtements en Europe et marche aussi pour la petite électronique et les articles de maison. Des photos nettes, une description honnête et le bon prix font l'essentiel du travail.`,
    sections: [
      {
        h2: 'Qui paie les frais',
        html: `<p>Les vendeurs ne paient pas de frais de vente sur Vinted. L'acheteur paie des frais de Protection acheteurs et la livraison en plus de ton prix, donc le total qu'il voit est plus élevé que ce que tu demandes. Des mises en avant payantes, comme le boost d'un article, sont proposées aux vendeurs. Les frais peuvent varier selon le pays et évoluer, alors vérifie les règles actuelles dans le centre d'aide de Vinted.</p>`,
      },
      {
        h2: 'Des photos qui donnent envie de cliquer',
        html: `<ul><li>Utilise la lumière du jour et un fond uni.</li><li>Montre l'avant, l'arrière, l'étiquette de marque et l'étiquette de taille.</li><li>Photographie les défauts de près: les acheteurs font confiance aux vendeurs qui les montrent.</li><li>Ta première photo est celle qu'on voit dans les résultats de recherche, alors choisis la plus nette.</li></ul>`,
      },
      {
        h2: 'Titre et description',
        html: `<p>Commence le titre par la marque et l'article, puis un détail clé comme la taille ou la couleur: « Jean Levi's 501 W32 L32, bleu foncé ». Dans la description, indique la taille et, pour les vêtements, les mesures (par exemple tour de poitrine et longueur), la matière d'après l'étiquette d'entretien, la coupe et l'état, défauts compris. Ajoute quelques mots que les gens recherchent, comme le style ou l'occasion.</p>`,
      },
      {
        h2: `Choisir l'état honnêtement`,
        html: `<p>Vinted te demande de choisir un état, de « Neuf avec étiquette » à « Satisfaisant ». Indiquer un meilleur état que celui de l'article est une cause fréquente de litiges et de retours. Dans le doute, choisis l'état inférieur et explique dans la description.</p>`,
      },
      {
        h2: 'Fixer le prix',
        html: `<p>Cherche sur Vinted la même marque et le même article dans un état similaire et place ton prix dans cette fourchette. Beaucoup d'acheteurs font des offres, alors garde un peu de marge. Les réductions sur les lots encouragent les acheteurs à prendre plusieurs articles dans un seul colis, ce qui t'évite aussi des allers-retours au bureau de poste.</p>`,
      },
      {
        h2: 'Expédition',
        html: `<p>Emballe les articles soigneusement, expédie dans le délai que Vinted te donne et garde la preuve de dépôt jusqu'à ce que l'acheteur ait confirmé la commande.</p>`,
      },
      {
        h2: 'Écrire tes annonces plus vite',
        html: `<p>Le <a href="${h('/vinted-listing-generator')}">générateur d'annonces FlipLens</a> transforme une photo en titre et description Vinted dans ta langue et te dit ce que les acheteurs vont demander, comme la taille ou les mesures.</p>`,
      },
    ],
    faq: [
      { q: 'Les vendeurs paient-ils des frais sur Vinted?', a: `Pas de frais de vente. L'acheteur paie des frais de Protection acheteurs et la livraison en plus du prix. Les mises en avant facultatives sont payantes.` },
      { q: 'Comment écrire une bonne description Vinted?', a: `Indique la marque, la taille et les mesures, la matière, la coupe et un état honnête avec les défauts, plus quelques mots que les acheteurs recherchent.` },
    ],
  },
  {
    path: '/best-resale-value-apps',
    kind: 'article',
    crumb: 'Méthodes pour la valeur de revente',
    title: 'Vérifier la valeur de revente en Europe: applis et méthodes comparées (2026)',
    description: `Une comparaison honnête des façons de savoir ce que vaut un article d'occasion en Europe: FlipLens, les ventes réussies sur eBay, les recherches sur Vinted et Kleinanzeigen, Google Lens et les offres de reprise.`,
    h1: 'Vérifier la valeur de revente en Europe: applis et méthodes comparées',
    lead: `Il n'existe pas de source parfaite unique pour les prix d'occasion. Chaque méthode ci-dessous répond à une question un peu différente. Voici à quoi chacune sert, ses limites et quand l'utiliser.`,
    sections: [
      {
        h2: "En un coup d'œil",
        html: `<table><thead><tr><th>Méthode</th><th>Rapidité</th><th>Données</th><th>Prix vendus ou demandés</th><th>Pays</th><th>Coût</th></tr></thead><tbody><tr><td>FlipLens</td><td>Quelques secondes, par photo, code-barres ou nom du modèle</td><td>Annonces eBay actives, filtrées et ajustées selon l'état</td><td>Prix demandés, ajustés à la baisse</td><td>Allemagne, France, Italie, Espagne, Pays-Bas en même temps, ou Royaume-Uni (eBay.co.uk)</td><td>${PLANS.free.monthlyValuations} vérifications gratuites par mois, forfaits payants pour plus</td></tr><tr><td>Filtre eBay « Objets vendus »</td><td>Quelques minutes par article</td><td>Ventes conclues sur un seul site eBay</td><td>Prix vendus</td><td>Un pays à la fois</td><td>Gratuit</td></tr><tr><td>Recherches sur Vinted, Kleinanzeigen</td><td>Quelques minutes</td><td>Annonces locales actuelles</td><td>Prix demandés</td><td>Une plateforme et une région</td><td>Gratuit</td></tr><tr><td>Google Lens, puis recherche sur une plateforme</td><td>Rapide pour identifier, lent pour le prix</td><td>Correspondance visuelle, puis ta propre recherche</td><td>Ce que tu trouves</td><td>Tous</td><td>Gratuit</td></tr><tr><td>Sites de reprise et de rachat</td><td>Offre immédiate</td><td>La grille de prix de l'acheteur</td><td>Une offre pour te racheter l'article</td><td>Variable</td><td>Gratuit</td></tr></tbody></table>`,
      },
      {
        h2: 'FlipLens',
        html: `<p>FlipLens identifie le modèle exact à partir d'une photo, d'un code-barres ou d'un nom tapé, lit les annonces eBay actives comparables dans cinq pays de l'UE ou sur eBay.co.uk, écarte les autres variantes, les lots et les articles en panne, ajuste selon l'état et donne une fourchette de revente, ton bénéfice après frais et livraison et le prix maximum. <strong>Idéal pour:</strong> décider vite en brocante et sur les petites annonces, quand tu ne veux pas chercher chaque article à la main. <strong>Limites:</strong> il travaille sur des prix demandés, pas sur des prix de vente confirmés; il couvre l'électronique grand public, le gaming, la photo et l'outillage électrique, pas la mode; s'il y a trop peu d'annonces comparables, il le dit au lieu d'estimer. Voir <a href="${h('/how-it-works')}">comment ça marche</a>.</p>`,
      },
      {
        h2: 'Recherche eBay avec le filtre « Objets vendus »',
        html: `<p>Sur eBay, tu peux filtrer une recherche pour afficher les articles réellement vendus. <strong>Mieux que FlipLens pour:</strong> montrer de vrais prix finaux plutôt que des prix demandés. <strong>Inconvénients:</strong> tu vérifies un site eBay à la fois, tu dois parcourir toi-même les résultats pour écarter les autres générations, les lots et les articles en panne, et tu dois encore déduire les frais et la livraison pour connaître ton bénéfice. Ça vaut le coup pour les articles chers avant de t'engager.</p>`,
      },
      {
        h2: 'Chercher sur Vinted ou Kleinanzeigen',
        html: `<p>Chercher sur la plateforme où tu comptes vendre te montre la concurrence que tu auras. <strong>Idéal pour:</strong> les prix locaux et les articles qui se vendent surtout par petites annonces. <strong>Inconvénients:</strong> tu ne vois que des prix demandés, et les annonces qui restent invendues pendant des semaines tirent l'image vers le haut. FlipLens renvoie vers ces recherches depuis chaque résultat pour que tu compares en un appui.</p>`,
      },
      {
        h2: 'Google Lens pour identifier un article inconnu',
        html: `<p>Quand tu ne sais pas ce qu'est un article, une recherche par image peut trouver son nom ou son modèle. <strong>Idéal pour:</strong> les articles inhabituels, les pièces vintage et tout ce qui n'a pas d'étiquette lisible. <strong>Inconvénients:</strong> il identifie, il ne donne pas de prix; tu dois encore chercher sur les plateformes et juger toi-même l'état et les variantes.</p>`,
      },
      {
        h2: 'Offres de reprise et de rachat',
        html: `<p>Certains magasins et sites font une offre immédiate pour racheter ton téléphone, ta console ou ton appareil photo d'occasion. <strong>Idéal pour:</strong> vendre vite et sans effort. <strong>Inconvénients:</strong> l'offre correspond à ce que l'acheteur est prêt à payer pour revendre lui-même, elle est donc en général bien en dessous de ce que tu obtiendrais en vendant entre particuliers. C'est un plancher, pas une valeur de revente.</p>`,
      },
      {
        h2: 'Quelle méthode, et quand',
        html: `<ul><li><strong>Devant un stand, quelques secondes pour décider:</strong> FlipLens.</li><li><strong>Un article cher avant de l'acheter:</strong> FlipLens d'abord, puis le filtre eBay des objets vendus pour confirmer.</li><li><strong>Fixer le prix de ta propre annonce:</strong> regarde ce qui est en vente en ce moment sur ta plateforme.</li><li><strong>Aucune idée de ce qu'est l'article:</strong> Google Lens d'abord.</li><li><strong>Tu veux juste t'en débarrasser:</strong> une offre de reprise, en sachant que c'est le chiffre le plus bas.</li></ul>`,
      },
    ],
    faq: [
      { q: 'Quelle est la façon la plus précise de connaître la valeur de revente?', a: `Les prix de vente récents du modèle exact dans le même état, corrigés des frais et de la livraison. Le filtre eBay des objets vendus les montre pour un pays à la fois; FlipLens donne une estimation rapide sur cinq pays de l'UE ou sur eBay.co.uk à partir des annonces actives.` },
      { q: 'Pourquoi les offres de reprise sont-elles si basses?', a: `L'acheteur doit revendre l'article et faire un bénéfice, donc l'offre est inférieure au prix de revente entre particuliers.` },
      { q: 'Existe-t-il un moyen gratuit de vérifier la valeur de revente?', a: `Oui. Les recherches sur les plateformes et le filtre eBay des objets vendus sont gratuits, et FlipLens inclut ${PLANS.free.monthlyValuations} vérifications gratuites par mois.` },
    ],
  },
  {
    path: '/guides/how-much-is-my-console-worth',
    kind: 'article',
    crumb: 'Combien vaut ma console',
    parent: { path: '/guides', name: 'Guides' },
    title: 'Combien vaut ma console? Consoles, consoles portables, manettes et jeux',
    description: `Ce qui fait la valeur de revente d'une console, d'une console portable, d'une manette ou d'un jeu d'occasion en Europe, les erreurs qui coûtent de l'argent et comment vérifier le prix en quelques secondes.`,
    h1: 'Combien vaut ma console?',
    lead: `Le matériel de jeu se revend bien, mais deux consoles qui se ressemblent peuvent valoir des sommes très différentes. Voici les détails qui font le prix.`,
    sections: [
      {
        h2: 'Ce qui fait le prix',
        html: `<ul><li><strong>Modèle et révision exacts:</strong> par exemple un modèle standard face à une version OLED ou Slim, ou une édition avec lecteur face à une édition numérique. La référence sous la console ou à l'arrière te le dit.</li><li><strong>Stockage:</strong> un stockage interne plus grand se vend en général plus cher.</li><li><strong>État:</strong> rayures sur l'écran, plastique jauni, ventilateur bruyant et drift des sticks de manette font baisser le prix.</li><li><strong>Accessoires:</strong> boîte d'origine, manettes, dock, câbles et alimentation. Une console sans son alimentation est plus difficile à vendre.</li><li><strong>Compte et bannissement:</strong> une console encore liée au compte de quelqu'un d'autre, ou bannie des services en ligne, vaut beaucoup moins.</li></ul>`,
      },
      {
        h2: 'Manettes et jeux',
        html: `<p>Pour les manettes, on vérifie le drift des sticks et l'usure des boutons; les manettes officielles se vendent mieux que celles d'autres marques. Pour les jeux, l'édition compte (standard, collector, région), ainsi que la présence du boîtier, de la notice et des éventuels codes. Les jeux sous blister et les jeux rétro complets en boîte sont un marché à part: compare ce qui est comparable.</p>`,
      },
      {
        h2: 'Erreurs fréquentes',
        html: `<ul><li>Comparer ton article à un lot qui inclut des jeux ou des manettes en plus.</li><li>Prendre le prix demandé le plus haut pour la valeur.</li><li>Oublier la livraison: les consoles sont lourdes et encombrantes.</li><li>Acheter une console portable sans tester l'écran et les boutons.</li></ul>`,
      },
      {
        h2: 'Checklist rapide',
        html: `<ul><li>Référence du modèle et stockage notés.</li><li>Elle s'allume, lit les disques (si elle a un lecteur), les manettes se connectent.</li><li>Déconnectée de tous les comptes ou réinitialisée aux paramètres d'usine.</li><li>Alimentation et câbles inclus.</li><li>Prix comparé au même modèle dans le même état.</li></ul>`,
      },
      {
        h2: 'Où vendre et comment vérifier vite',
        html: `<p>Les consoles se vendent bien sur eBay et en local; voir <a href="${h('/guides/where-to-sell-used-electronics-europe')}">où vendre de l'électronique d'occasion en Europe</a>. Pour vérifier une console en quelques secondes, scanne son code-barres ou tape le modèle dans FlipLens: il compare les annonces de cinq pays de l'UE ou d'eBay.co.uk et affiche le prix maximum. <a href="${h('/how-it-works')}">Comment ça marche</a>.</p>`,
      },
    ],
    faq: [
      { q: `Comment savoir quel modèle de console j'ai?`, a: `Cherche la référence du modèle sous la console, à l'arrière ou dans les paramètres système. Elle indique la version exacte et souvent la capacité de stockage.` },
      { q: `La boîte d'origine compte-t-elle?`, a: `Oui. Une console complète avec boîte, manettes et câbles se vend en général plus vite et plus cher que la console seule.` },
    ],
  },
  {
    path: '/guides/resale-value-cameras-lenses',
    kind: 'article',
    crumb: 'Appareils photo et objectifs',
    parent: { path: '/guides', name: 'Guides' },
    title: `Valeur de revente des appareils photo et objectifs d'occasion: quoi vérifier avant d'acheter`,
    description: `Ce qui fait la valeur de revente d'un boîtier ou d'un objectif d'occasion en Europe: monture, nombre de déclenchements, état du capteur et des lentilles, accessoires et région, plus une checklist rapide.`,
    h1: `Valeur de revente des appareils photo et objectifs d'occasion`,
    lead: `Le matériel photo garde mieux sa valeur que la plupart des appareils électroniques, mais un seul problème, comme des champignons dans un objectif, peut le rendre presque sans valeur. Vérifie ces points avant de payer.`,
    sections: [
      {
        h2: `Ce qui fait le prix d'un boîtier`,
        html: `<ul><li><strong>Modèle exact:</strong> les générations d'une même gamme ont des valeurs très différentes.</li><li><strong>Nombre de déclenchements:</strong> le nombre de photos prises par l'appareil. Un nombre élevé fait baisser la valeur; beaucoup d'appareils permettent de le lire dans les fichiers ou le menu.</li><li><strong>Capteur et écran:</strong> rayures, pixels morts et poussière qui ne part pas.</li><li><strong>Accessoires:</strong> batterie, chargeur, sangle, bouchons et boîte.</li><li><strong>Région et langue:</strong> certains modèles importés ont des menus ou des conditions de garantie différents.</li></ul>`,
      },
      {
        h2: `Ce qui fait le prix d'un objectif`,
        html: `<ul><li><strong>Monture:</strong> une même focale existe pour plusieurs montures (par exemple Canon RF et EF, Sony E/FE, Nikon Z et F). Compare uniquement la même monture.</li><li><strong>État optique:</strong> champignons, voile, décollement des lentilles et rayures profondes font fortement baisser la valeur. Éclaire l'objectif par l'arrière avec une lampe.</li><li><strong>Mécanique:</strong> l'autofocus fonctionne, les bagues de zoom et de mise au point sont fluides, les lamelles du diaphragme sont propres et sèches.</li><li><strong>Version:</strong> beaucoup d'objectifs existent en plusieurs versions (par exemple avec ou sans stabilisation).</li></ul>`,
      },
      {
        h2: 'Erreurs fréquentes',
        html: `<ul><li>Comparer un objectif de même focale mais avec une autre monture ou une autre version.</li><li>Ne pas tester l'autofocus sur un boîtier.</li><li>Rater des champignons parce que l'objectif n'a pas été vérifié face à la lumière.</li><li>Ignorer le nombre de déclenchements d'un boîtier qui a l'air propre.</li></ul>`,
      },
      {
        h2: 'Checklist rapide',
        html: `<ul><li>Modèle, monture et version notés.</li><li>Objectif vérifié face à la lumière (champignons et voile).</li><li>Le boîtier s'allume, prend une photo, nombre de déclenchements connu si possible.</li><li>Batterie et chargeur inclus.</li></ul>`,
      },
      {
        h2: 'Où vendre et comment vérifier vite',
        html: `<p>Les appareils photo et objectifs se vendent bien sur eBay partout en Europe; voir <a href="${h('/guides/where-to-sell-used-electronics-europe')}">où vendre de l'électronique d'occasion en Europe</a>. FlipLens lit le modèle et la monture sur une photo de l'étiquette ou du fût de l'objectif et compare les annonces de cinq pays de l'UE ou d'eBay.co.uk. <a href="${h('/how-it-works')}">Comment ça marche</a>.</p>`,
      },
    ],
    faq: [
      { q: `Comment vérifier qu'un objectif d'occasion n'a pas de champignons?`, a: `Éclaire l'objectif par l'arrière avec une lumière vive et cherche des motifs en forme de filaments, des taches ou un voile laiteux à l'intérieur des lentilles.` },
      { q: 'Le nombre de déclenchements compte-t-il à la revente?', a: `Oui. Les acheteurs le comparent à la durée de vie prévue de l'obturateur pour ce modèle, donc un nombre faible aide le prix.` },
    ],
  },
  {
    path: '/guides/resale-value-headphones',
    kind: 'article',
    crumb: 'Casques et écouteurs',
    parent: { path: '/guides', name: 'Guides' },
    title: `Valeur de revente des casques et écouteurs d'occasion: générations, batterie et hygiène`,
    description: `Ce qui fait la valeur de revente des casques et écouteurs d'occasion en Europe: génération exacte, usure de la batterie, coussinets, accessoires et hygiène, plus une checklist rapide.`,
    h1: `Valeur de revente des casques et écouteurs d'occasion`,
    lead: `Les casques populaires se revendent vite, mais les générations se ressemblent et les batteries s'usent. Voici les détails que les acheteurs vérifient.`,
    sections: [
      {
        h2: 'Ce qui fait le prix',
        html: `<ul><li><strong>Génération exacte:</strong> des modèles d'une même gamme, comme les Sony WH-1000XM4 et WH-1000XM5, ou différentes générations d'AirPods, se vendent à des prix différents. Vérifie la référence sur l'arceau, le boîtier ou dans les réglages.</li><li><strong>Batterie:</strong> les casques et écouteurs sans fil perdent de la capacité avec le temps; une autonomie nettement réduite fait baisser la valeur.</li><li><strong>Coussinets et embouts:</strong> des coussinets usés ou qui s'effritent font fuir les acheteurs, mais peuvent souvent être remplacés.</li><li><strong>Accessoires:</strong> boîtier, câble, adaptateur et boîte.</li><li><strong>Authenticité:</strong> les écouteurs populaires sont souvent contrefaits; les numéros de série et le comportement lors de l'appairage aident à les repérer.</li></ul>`,
      },
      {
        h2: 'Hygiène et écouteurs',
        html: `<p>Beaucoup d'acheteurs se méfient des intra-auriculaires d'occasion. Nettoie-les soigneusement, remplace les embouts en silicone si possible et précise-le dans l'annonce. Un écouteur manquant ou un boîtier de charge absent rend un ensemble beaucoup plus difficile à vendre.</p>`,
      },
      {
        h2: 'Erreurs fréquentes',
        html: `<ul><li>Confondre deux générations presque identiques.</li><li>Ne pas tester la réduction de bruit, les micros et les deux côtés.</li><li>Acheter des écouteurs encore liés au compte de quelqu'un d'autre.</li></ul>`,
      },
      {
        h2: 'Checklist rapide',
        html: `<ul><li>Référence et génération confirmées.</li><li>Les deux côtés fonctionnent, réduction de bruit et micro testés.</li><li>La batterie tient la charge.</li><li>Boîtier, câble et embouts inclus.</li><li>Retirés du compte de l'ancien propriétaire.</li></ul>`,
      },
      {
        h2: 'Où vendre et comment vérifier vite',
        html: `<p>Les casques et écouteurs se vendent bien sur eBay et Vinted; voir <a href="${h('/guides/where-to-sell-used-electronics-europe')}">où vendre de l'électronique d'occasion en Europe</a>. Dans FlipLens, une photo de l'étiquette ou le code-barres de la boîte suffit pour identifier la génération et comparer les prix dans cinq pays de l'UE ou sur eBay.co.uk. <a href="${h('/how-it-works')}">Comment ça marche</a>.</p>`,
      },
    ],
    faq: [
      { q: 'Comment distinguer les générations de casques?', a: `Lis la référence imprimée sur l'arceau, le boîtier ou la boîte, ou dans l'application associée ou les réglages Bluetooth.` },
      { q: `Puis-je vendre des écouteurs d'occasion?`, a: `Oui, mais nettoie-les, remplace les embouts si tu peux et décris leur état honnêtement. Les ensembles complets avec le boîtier de charge se vendent le mieux.` },
    ],
  },
  {
    path: '/guides/sell-used-phone-europe',
    kind: 'article',
    crumb: `Vendre un téléphone d'occasion`,
    parent: { path: '/guides', name: 'Guides' },
    title: `Vendre un téléphone d'occasion en Europe: ce qui fait le prix et quoi vérifier`,
    description: `Ce qui fait la valeur de revente d'un smartphone d'occasion en Europe: modèle, stockage, état de la batterie, verrouillages de compte et d'opérateur, état, plus une checklist avant d'acheter ou de vendre.`,
    h1: `Vendre un téléphone d'occasion en Europe`,
    lead: `Les téléphones sont l'électronique d'occasion la plus courante, et la plus facile à mal évaluer. Un téléphone verrouillé ou une mauvaise capacité de stockage peuvent transformer une bonne affaire en perte.`,
    sections: [
      {
        h2: 'Ce qui fait le prix',
        html: `<ul><li><strong>Modèle exact:</strong> les versions standard, Plus, Pro et Max ont des valeurs très différentes.</li><li><strong>Stockage:</strong> plus de stockage se vend plus cher. Vérifie-le dans les réglages, pas seulement sur la boîte.</li><li><strong>État de la batterie:</strong> beaucoup de téléphones affichent l'état de la batterie dans les réglages; une batterie faible fait baisser le prix.</li><li><strong>État:</strong> rayures ou fissures de l'écran, dos en verre, bosses sur le cadre, lentilles des caméras, boutons et ports.</li><li><strong>Accessoires:</strong> la boîte et le câble aident un peu; c'est surtout le téléphone qui compte.</li></ul>`,
      },
      {
        h2: `Verrouillages de compte et d'opérateur`,
        html: `<p>Un téléphone encore lié au compte de l'ancien propriétaire (par exemple le Verrouillage d'activation d'Apple ou un compte Google après une réinitialisation) ne peut pas être configuré par un nouveau propriétaire et ne vaut qu'une fraction du prix. Assure-toi que le vendeur retire le compte et réinitialise le téléphone devant toi. Vérifie aussi si le téléphone est bloqué sur un opérateur: les téléphones désimlockés trouvent plus d'acheteurs.</p>`,
      },
      {
        h2: 'Erreurs fréquentes',
        html: `<ul><li>Acheter un téléphone encore connecté à un compte.</li><li>Comparer les prix d'une autre capacité de stockage ou d'une autre version.</li><li>Ne pas vérifier si l'écran a été remplacé ou n'est pas d'origine.</li><li>Ignorer l'état de la batterie.</li></ul>`,
      },
      {
        h2: 'Checklist rapide',
        html: `<ul><li>Modèle et stockage confirmés dans les réglages.</li><li>Déconnecté de tous les comptes et réinitialisé aux paramètres d'usine.</li><li>Non bloqué sur un opérateur.</li><li>État de la batterie vérifié.</li><li>Écran, caméras, haut-parleurs, micro et port de charge testés.</li></ul>`,
      },
      {
        h2: 'Où vendre et comment vérifier vite',
        html: `<p>Les téléphones se vendent sur eBay, sur les sites de petites annonces et sur Vinted; voir <a href="${h('/guides/where-to-sell-used-electronics-europe')}">où vendre de l'électronique d'occasion en Europe</a>. FlipLens identifie le modèle à partir d'une photo ou d'un code-barres, te laisse régler le stockage et compare les annonces de cinq pays de l'UE ou d'eBay.co.uk. <a href="${h('/how-it-works')}">Comment ça marche</a>.</p>`,
      },
    ],
    faq: [
      { q: `Que vérifier avant d'acheter un téléphone d'occasion?`, a: `Qu'il est déconnecté de tous les comptes et réinitialisé, non bloqué sur un opérateur, qu'il a le stockage attendu, une batterie en bon état, et que l'écran, les caméras et le port de charge fonctionnent.` },
      { q: 'La capacité de stockage change-t-elle la valeur de revente?', a: `Oui. Le même modèle avec plus de stockage se vend en général plus cher, alors compare toujours la même capacité.` },
    ],
  },
  {
    path: '/about',
    kind: 'page',
    crumb: 'À propos',
    title: `À propos de FlipLens: un outil indépendant de valeur de revente pour l'Europe`,
    description: `Qui gère FlipLens, d'où viennent ses prix et ses principes: aucune photo enregistrée, aucune donnée eBay enregistrée, honnête sur l'incertitude, indépendant d'eBay et de Vinted.`,
    h1: 'À propos de FlipLens',
    lead: `FlipLens aide celles et ceux qui achètent d'occasion pour revendre à décider en quelques secondes si un article vaut le coup, avec de vraies données de marché venues de toute l'Europe.`,
    sections: [
      {
        h2: `Ce que c'est`,
        html: `<p>Une application web pour les revendeurs et les chasseurs de bonnes affaires. Prends une photo, scanne un code-barres ou tape un modèle, et FlipLens affiche la fourchette de revente, ton bénéfice après frais et livraison, le prix maximum et un verdict clair. Il écrit aussi des annonces pour Vinted, eBay et Kleinanzeigen à partir d'une photo et garde la trace de ce que tu as acheté et vendu.</p>`,
      },
      {
        h2: 'Qui le gère',
        html: `<p>FlipLens est exploité par ${esc(LEGAL.operator)} en Slovénie. Contact: <a href="mailto:${LEGAL.supportEmail}">${LEGAL.supportEmail}</a>. Créateurs et partenaires: voir le <a href="${h('/partner')}">programme partenaires</a>.</p>`,
      },
      {
        h2: `D'où viennent les données`,
        html: `<p>Les prix viennent des annonces eBay actives en Allemagne, en France, en Italie, en Espagne et aux Pays-Bas, lues via l'API officielle d'eBay et converties en euros avec les taux de change de la Banque centrale européenne. Si tu vends sur eBay.co.uk, les prix viennent des annonces d'eBay.co.uk et s'affichent en livres sterling. La reconnaissance des articles utilise un modèle de vision IA. Les détails et les limites sont expliqués dans <a href="${h('/how-it-works')}">comment ça marche</a>.</p>`,
      },
      {
        h2: 'Principes',
        html: `<ul><li><strong>Les photos ne sont jamais enregistrées.</strong> Elles servent uniquement à identifier l'article ou à écrire l'annonce.</li><li><strong>Aucune donnée eBay n'est enregistrée.</strong> Les annonces sont lues en direct et mises en cache brièvement, comme l'exige la licence de l'API eBay.</li><li><strong>Honnête sur l'incertitude.</strong> Chaque estimation affiche son indice de confiance; avec trop peu de données, FlipLens le dit au lieu de deviner.</li><li><strong>Indépendant.</strong> FlipLens n'est lié ni à eBay, ni à Vinted, ni à Kleinanzeigen, et n'achète, ne vend et n'expédie aucun article.</li></ul>`,
      },
      {
        h2: 'Langues',
        html: `<p>FlipLens est disponible en anglais, en allemand, en italien et en français. L'application suit la langue de ton navigateur; les pages en anglais se trouvent sur <a href="/" hreflang="en" lang="en">fliplens.eu</a>, en allemand sur <a href="/de" hreflang="de" lang="de">fliplens.eu/de</a> et en italien sur <a href="/it" hreflang="it" lang="it">fliplens.eu/it</a>. Voir aussi la <a href="/privacy">Politique de confidentialité</a> et les <a href="/terms">Conditions d'utilisation</a>.</p>`,
      },
    ],
  },
];

const GUIDES = PAGES.filter((p) => p.path.startsWith('/guides/'));
PAGES.push({
  path: '/guides',
  kind: 'page',
  crumb: 'Guides',
  title: `Guides de revente pour l'Europe: prix, frais et approvisionnement`,
  description: `Des guides pratiques pour les revendeurs en Europe: vérifier la valeur de revente, les frais eBay.de, où vendre de l'électronique d'occasion, vendre sur Vinted et une checklist pour la brocante.`,
  h1: 'Guides de revente',
  lead: `Des guides courts et pratiques pour trouver et revendre des articles d'occasion en Europe.`,
  sections: [
    {
      h2: 'Tous les guides',
      html: `<ul class="guide-list">${GUIDES.map((g) => `<li><a href="${h(g.path)}">${esc(g.h1)}</a><br><span>${esc(g.description)}</span></li>`).join('')}</ul>`,
    },
  ],
});

PAGES.push({
  path: '/partner',
  kind: 'page',
  crumb: 'Programme partenaires',
  cta: `<p class="cta"><a class="btn" href="/fr">Obtenir mon lien</a><span>Connecte-toi avec Google, ouvre Profil, puis « Inviter des amis ». Gratuit.</span></p>`,
  title: `Programme partenaires FlipLens: ${REFERRAL.sharePct} % de commission pendant ${REFERRAL.months} mois`,
  description: `Recommande FlipLens aux revendeurs et gagne ${REFERRAL.sharePct} % de chaque paiement des personnes que tu invites, pendant ${REFERRAL.months} mois. Ta communauté reçoit ${INVITE_BONUS_CHECKS} vérifications gratuites en plus. Paiements à partir de ${eur(REFERRAL.minPayoutMinor)}.`,
  h1: `${REFERRAL.sharePct} % de commission pendant ${REFERRAL.months} mois`,
  lead: `Tu fais des vidéos sur tes trouvailles en brocante, tes reventes ou la vente sur Vinted? Montre FlipLens à ta communauté et gagne de l'argent sur chaque personne qui s'abonne via ton lien.`,
  sections: [
    {
      h2: 'Pour qui',
      html: `<p>Les revendeurs et créateurs sur TikTok, Instagram et YouTube qui publient sur les brocantes, les trouvailles en friperie, la revente d'électronique ou la vente sur Vinted, eBay et Kleinanzeigen. Les utilisateurs ordinaires peuvent aussi participer: chaque compte FlipLens a un lien d'invitation.</p>`,
    },
    {
      h2: 'Ce que tu gagnes',
      html: `<ul><li><strong>${REFERRAL.sharePct} % de chaque paiement</strong> des personnes qui s'inscrivent avec ton lien, hors taxes.</li><li>Pendant <strong>${REFERRAL.months} mois</strong> à partir du premier paiement de chaque personne, renouvellements compris.</li><li>Les gains deviennent disponibles ${REFERRAL.holdDays} jours après chaque paiement (la période de remboursement).</li><li>Paiements à partir de ${eur(REFERRAL.minPayoutMinor)} par PayPal ou virement bancaire, à demander dans l'application.</li></ul><p>Exemple: ${EXAMPLE_PEOPLE} personnes sur Pro (${eur(PLANS.pro.priceMonthlyMinor)} par mois) te rapportent environ <strong>${eur(exampleMinor)} par mois</strong> pendant ${REFERRAL.months} mois.</p>`,
    },
    {
      h2: 'Ce que reçoit ta communauté',
      html: `<p>Les personnes qui créent un nouveau compte avec ton lien reçoivent <strong>${INVITE_BONUS_CHECKS} vérifications gratuites en plus</strong> le premier mois, en plus du forfait gratuit. Elles peuvent vérifier à quel prix un article se revend, voir leur bénéfice après frais et écrire des annonces Vinted, eBay ou Kleinanzeigen à partir d'une photo.</p>`,
    },
    {
      h2: 'Comment participer',
      html: `<ol><li>Connecte-toi sur <a href="/fr">fliplens.eu</a> avec Google.</li><li>Ouvre Profil, puis « Inviter des amis ».</li><li>Copie ton lien (fliplens.eu/fr?ref=toncode) et partage-le dans ta bio, tes vidéos et tes stories.</li></ol><p>Tu veux un code personnalisé comme <code>?ref=anna</code>? Écris à <a href="mailto:${LEGAL.supportEmail}">${LEGAL.supportEmail}</a> après t'être connecté.</p>`,
    },
    {
      h2: 'Idées de contenu',
      html: `<ul><li>Vérification en brocante: « Est-ce que ça vaut le coup? » avec le verdict à l'écran.</li><li>Avant et après d'une revente, avec le vrai bénéfice.</li><li>« J'ai transformé ça en annonce Vinted en 10 secondes. »</li><li>Les cartes de trouvailles de l'application partagées dans tes stories.</li></ul>`,
    },
    {
      h2: 'Règles',
      html: `<ul><li>Signale clairement les contenus sponsorisés comme publicité, selon les règles de ton pays (en Allemagne « Werbung » ou « Anzeige »).</li><li>Pas de promesses trompeuses sur les gains ou les résultats, pas de spam.</li><li>Pas d'annonces sur les moteurs de recherche avec le nom FlipLens, pas d'auto-parrainage ni de comptes supplémentaires.</li></ul><p>Règles complètes: <a href="/terms">Conditions d'utilisation</a>, section « Referral programme ».</p>`,
    },
    {
      h2: 'Éléments de marque',
      html: `<p><a href="/og.png">Image d'aperçu (1200×630)</a> · <a href="/icons/icon-512.png">Icône de l'application (512×512)</a></p>`,
    },
  ],
  faq: [
    { q: 'La participation est-elle payante?', a: `Non. Chaque utilisateur connecté a un lien d'invitation, et le forfait gratuit suffit pour participer.` },
    { q: 'Pendant combien de temps je gagne sur une personne invitée?', a: `${REFERRAL.months} mois à partir de son premier paiement. Tu reçois ${REFERRAL.sharePct} % de chaque paiement pendant cette période, renouvellements compris.` },
    { q: 'Quand et comment suis-je payé?', a: `Les gains deviennent disponibles ${REFERRAL.holdDays} jours après chaque paiement. À partir de ${eur(REFERRAL.minPayoutMinor)}, tu peux demander un paiement par PayPal ou virement bancaire dans l'application; il est en général versé sous 14 jours.` },
    { q: 'Qui paie les impôts sur mes gains?', a: `Toi. Les gains sont versés sans retenue d'impôt; déclare-les comme l'exige la loi de ton pays.` },
  ],
});

const UI: UiStrings = {
  nav: [['/how-it-works', 'Comment ça marche'], ['/pricing', 'Tarifs'], ['/guides', 'Guides'], ['/faq', 'FAQ']],
  tryFree: 'Essayer gratuitement',
  privacy: 'Confidentialité',
  terms: `Conditions d'utilisation`,
  partner: 'Programme partenaires',
  about: 'À propos',
  compare: 'Méthodes comparées',
  disclaimer: `FlipLens n'est pas lié à eBay. Données eBay affichées via l'API eBay.`,
  questions: 'Questions',
  answers: 'Réponses',
  updated: (d: string) => `Mis à jour le ${d.split('-').reverse().join('/')} · par FlipLens`,
  locale: 'fr_FR',
  cta: CTA,
};

/** French start-page text for crawlers on /fr; the API swaps it into the shell (apps/api/src/web.ts). */
function homePrerender(): string {
  return `<div class="prerender" lang="fr">
      <header><strong>FlipLens</strong> · <a href="/fr/how-it-works">Comment ça marche</a> · <a href="/fr/pricing">Tarifs</a> · <a href="/fr/guides">Guides</a> · <a href="/fr/faq">FAQ</a> · <a href="/" hreflang="en" lang="en">English</a> · <a href="/de" hreflang="de" lang="de">Deutsch</a> · <a href="/it" hreflang="it" lang="it">Italiano</a></header>
      <h1>Sache ce que ça vaut avant de l'acheter.</h1>
      <p>Pour les revendeurs en Europe. Prends une photo, scanne le code-barres ou tape le modèle: FlipLens te montre à quel prix l'article se revend sur eBay en Allemagne, en France, en Italie, en Espagne et aux Pays-Bas, ou sur eBay.co.uk au Royaume-Uni, ton bénéfice après frais et livraison, le prix maximum à payer et un verdict clair: Excellente affaire, Acheter, Limite ou Passe ton chemin.</p>
      <h2>Trois appuis, quelques secondes</h2>
      <ol><li>Scanne: photo de l'article ou de son étiquette, code-barres sur la boîte, ou tape simplement le modèle.</li><li>Saisis le prix (facultatif): sans prix, tu obtiens le prix maximum à payer.</li><li>Obtiens le verdict, avec les chiffres et les raisons.</li></ol>
      <h2>Fait pour décider, pas pour deviner</h2>
      <ul><li>Le modèle exact, pas juste « un casque »: mauvaises variantes, accessoires, lots et articles en panne sont écartés.</li><li>Données de marché en direct d'eBay dans cinq pays de l'UE, en euros, ou sur eBay.co.uk, en livres sterling. Tu vois chaque annonce utilisée.</li><li>Bénéfice après frais de la plateforme et livraison, plus le prix maximum à payer.</li><li>Honnête sur l'incertitude: chaque verdict affiche son indice de confiance; pas assez de données, pas de chiffre.</li><li>Tu vends? Transforme la photo de n'importe quel article, vêtements compris, en annonce Vinted, eBay ou Kleinanzeigen: <a href="/fr/vinted-listing-generator">générateur d'annonces</a>.</li></ul>
      <h2>Tarifs</h2>
      <ul>${plans.map((p) => `<li>${esc(p.name)}: ${p.priceMonthlyMinor ? `${eur(p.priceMonthlyMinor)} par mois` : 'gratuit'}. ${(FR_FEATURES[p.id] ?? []).map(esc).join(', ')}.</li>`).join('')}</ul>
      <h2>Questions</h2>
      ${COMMON_FAQ.map((f) => `<h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>`).join('')}
      <h2>Guides</h2>
      <ul>${GUIDES.map((g) => `<li><a href="${h(g.path)}">${esc(g.h1)}</a></li>`).join('')}</ul>
      <p><a href="/fr/partner">Programme partenaires: ${REFERRAL.sharePct} % de commission pendant ${REFERRAL.months} mois</a> · <a href="/privacy">Politique de confidentialité</a> · <a href="/terms">Conditions d'utilisation</a> · FlipLens n'est pas lié à eBay.</p>
    </div>`;
}

export const FR: LangPack = {
  pages: PAGES,
  commonFaq: COMMON_FAQ,
  ui: UI,
  home: {
    title: `FlipLens: ça vaut le coup d'acheter pour revendre? Vérification de la valeur de revente en Europe`,
    description: `Photo, code-barres ou modèle: à quel prix l'occasion se revend sur eBay dans 5 pays de l'UE et au Royaume-Uni, ton bénéfice et le prix maximum à payer.`,
    prerender: homePrerender(),
  },
};
