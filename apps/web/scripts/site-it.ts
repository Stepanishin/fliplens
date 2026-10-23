/**
 * Italian language pack of the static site (published under /it). Same base paths as the English PAGES in site.ts.
 * Imported by site.ts; must not import site.ts (it has side effects).
 */
import { PLANS, REFERRAL } from '@fliplens/core';
import { LEGAL } from '../src/legal.js';
import { PLAN_FEATURES_BY_LANG } from '../src/i18n.js';
import { EXAMPLE_PEOPLE, INVITE_BONUS_CHECKS, esc, eurIn, exampleMinor, href, numIn, type Faq, type LangPack, type Page, type UiStrings } from './site-common.js';

const eur = (minor: number): string => eurIn('it', minor);
const num = (n: number): string => numIn('it', n);
const h = (path: string): string => href('it', path);

/** Italian plan feature lines (kept in step with apps/web/src/i18n.ts). */
const IT_FEATURES: Record<string, readonly string[]> = PLAN_FEATURES_BY_LANG.it;
const plans = Object.values(PLANS);
const paid = plans.filter((p) => p.priceMonthlyMinor > 0);

const CTA_IT = `<p class="cta"><a class="btn" href="/it">Controlla gratis</a><span>${PLANS.free.monthlyValuations} controlli al mese gratis. Puoi provarne due anche senza account. Nessuna carta richiesta.</span></p>`;
const LISTING_CTA_IT = `<p class="cta"><a class="btn" href="/it?tool=listing">Scrivi il mio annuncio gratis</a><span>${PLANS.free.monthlyListings} annunci al mese gratis. Puoi provarne due anche senza account. Nessuna carta richiesta.</span></p>`;

const COMMON_FAQ_IT: Faq[] = [
  {
    q: `Che cos'è FlipLens?`,
    a: `FlipLens è una web app per chi rivende in Europa. Scatta una foto, scansiona il codice a barre o scrivi il modello: FlipLens ti mostra a quanto si rivende l'articolo su eBay in Germania, Francia, Italia, Spagna e Paesi Bassi o su eBay.co.uk, il tuo profitto al netto di commissioni e spedizione, il prezzo massimo da pagare e un verdetto chiaro: Ottimo affare, Compra, Al limite o Lascia stare.`,
  },
  {
    q: 'Da dove vengono i prezzi?',
    a: `Dagli annunci eBay attivi, letti tramite l'API ufficiale di eBay: in cinque paesi UE (Germania, Francia, Italia, Spagna e Paesi Bassi) con prezzi convertiti in euro ai tassi di cambio della BCE, oppure su eBay.co.uk con prezzi in sterline se vendi nel Regno Unito. I prezzi richiesti sono di solito più alti di quelli a cui gli articoli vengono davvero venduti, quindi FlipLens li corregge al ribasso e mostra sempre su quanti annunci si basa una stima. Puoi aprire ogni annuncio utilizzato.`,
  },
  {
    q: 'Quali articoli funzionano meglio?',
    a: `Elettronica di consumo, gaming e fotografia: cuffie, smartphone, tablet, laptop, smartwatch, altoparlanti, console, console portatili, controller, giochi, corpi macchina, obiettivi, action cam e fotocamere compatte, oltre agli elettroutensili. Anche abbigliamento, scarpe e borse di marca vengono valutati, per marca, tipo e condizione (stima più approssimativa che per l'elettronica). Set LEGO per numero del set; libri, vinili, CD e DVD con il codice a barre. Orologi per modello; gioielli di marca per marca e tipo (oro e argento senza marca, mobili e veicoli non vengono valutati).`,
  },
  {
    q: 'Devo inserire un prezzo?',
    a: `No. Senza prezzo FlipLens ti mostra a quanto si vende l'articolo e il prezzo massimo da pagare per il rendimento che vuoi ottenere. Con il prezzo ottieni verdetto, profitto e ROI per quell'affare preciso.`,
  },
  {
    q: 'Che fine fanno le mie foto e i miei dati?',
    a: `Le foto servono solo a riconoscere l'articolo e non vengono mai salvate. I tuoi controlli restano salvati finché non li elimini, e dal tuo profilo puoi esportare o eliminare tutto in qualsiasi momento.`,
  },
  {
    q: 'FlipLens fa parte di eBay?',
    a: `No. FlipLens è indipendente e mostra i dati di eBay tramite l'API ufficiale di eBay. Non compra, non vende e non spedisce nulla.`,
  },
];

const GUIDES_PARENT = { path: '/guides', name: 'Guide' };

const PAGES_IT: Page[] = [
  {
    path: '/how-it-works',
    kind: 'page',
    crumb: 'Come funziona',
    title: 'Come FlipLens stima valore di rivendita e profitto',
    description: `Come FlipLens riconosce il prodotto esatto, trova annunci eBay simili in cinque paesi UE o su eBay.co.uk, stima il valore di rivendita, sottrae commissioni e spedizione e decide tra Ottimo affare, Compra, Al limite e Lascia stare.`,
    h1: 'Come funziona FlipLens',
    lead: `FlipLens risponde a una sola domanda: "Posso comprarlo a X €. Conviene comprarlo per rivenderlo?" Ecco esattamente come nasce la risposta, compresi i casi in cui può sbagliare.`,
    sections: [
      {
        h2: '1. Riconoscere il prodotto esatto',
        html: `<p>Scatti una foto dell'articolo o della sua etichetta, scansioni il codice a barre sulla confezione o scrivi il modello. Le foto vengono riconosciute da un modello di visione IA; i codici a barre (EAN e UPC) vengono confrontati con gli annunci dei marketplace. FlipLens cerca i dettagli che cambiano il prezzo: generazione del modello (WH-1000XM4 non è XM5), memoria (128 GB non è 256 GB), innesto dell'obiettivo (RF non è EF) e condizioni. Prima del controllo puoi correggere qualsiasi cosa.</p>`,
      },
      {
        h2: '2. Trovare annunci simili',
        html: `<p>FlipLens cerca gli annunci eBay attuali in Germania, Francia, Italia, Spagna e Paesi Bassi tramite l'API ufficiale di eBay e converte i prezzi in euro con i tassi della Banca centrale europea. Se vendi su eBay.co.uk usa invece gli annunci di eBay.co.uk, con i prezzi in sterline. Poi scarta ciò che falserebbe il prezzo: altri modelli e varianti, accessori venduti da soli, bundle, articoli guasti o "per ricambi", duplicati e annunci in condizioni molto diverse. Puoi vedere ogni annuncio usato e il motivo per cui gli altri sono stati scartati. Vuoi sapere dove l'articolo rende di più? Il confronto Regno Unito vs UE nel risultato mostra con un tocco lo stesso articolo su eBay.co.uk e sui cinque siti eBay UE affiancati, in sterline e in euro, senza usare un controllo.</p>`,
      },
      {
        h2: '3. Stimare il valore di rivendita',
        html: `<p>Dagli annunci rimasti FlipLens costruisce una distribuzione dei prezzi adattata alle condizioni del tuo articolo e indica tre valori: un prezzo per vendita rapida, il prezzo di vendita atteso e un prezzo richiesto alto. Poiché i prezzi richiesti sono di solito più alti dei prezzi di vendita finali, la stima viene corretta al ribasso. Ogni stima ha un indice di affidabilità basato su quanti annunci corrispondono, quanto concordano tra loro e quanto bene è stato riconosciuto il prodotto.</p>`,
      },
      {
        h2: '4. Calcolare il profitto al netto delle commissioni',
        html: `<p>FlipLens sottrae le commissioni di vendita del marketplace su cui vendi (per esempio eBay.de privato o professionale, eBay.co.uk privato, Vinted o ritiro di persona), il costo di spedizione e il prezzo di acquisto. Il risultato è il profitto, il ritorno sull'investimento (ROI) e il <strong>prezzo massimo</strong> che conviene pagare per il ROI che vuoi ottenere: prezzo massimo = quanto ti resta dopo commissioni e spedizione ÷ (1 + ROI obiettivo).</p>`,
      },
      {
        h2: '5. Dare un verdetto, o ammettere di non sapere',
        html: `<p>Il verdetto è Ottimo affare, Compra, Al limite o Lascia stare, con i motivi e i rischi che ci stanno dietro. Se restano meno di cinque annunci corrispondenti, o il riconoscimento del prodotto è troppo incerto, FlipLens dice "dati di mercato insufficienti" invece di inventarsi un numero.</p>`,
      },
      {
        h2: 'Limiti noti',
        html: `<ul><li>I prezzi si basano su annunci attivi (prezzi richiesti), non su prezzi di vendita confermati.</li><li>L'offerta è visibile (quanti articoli sono in vendita e da quanto tempo), la velocità di vendita non ancora.</li><li>Oggetti da collezione e pezzi unici non sono supportati. Abbigliamento, scarpe e borse vengono valutati per marca, tipo e condizione, non come capo esatto.</li><li>Le commissioni cambiano: ogni profilo commissioni mostra quando è stato verificato l'ultima volta e rimanda alla sua fonte.</li></ul>`,
      },
    ],
  },
  {
    path: '/pricing',
    kind: 'page',
    crumb: 'Prezzi',
    title: `Prezzi FlipLens: controlli gratis, Pro ${eur(PLANS.pro.priceMonthlyMinor)}, Reseller ${eur(PLANS.reseller.priceMonthlyMinor)}`,
    description: `Free: ${PLANS.free.monthlyValuations} controlli al mese. Pro ${eur(PLANS.pro.priceMonthlyMinor)}: ${PLANS.pro.monthlyValuations} controlli e generatore di annunci. Reseller ${eur(PLANS.reseller.priceMonthlyMinor)}: fino a ${num(PLANS.reseller.monthlyValuations)} controlli. Prezzi finali, disdici quando vuoi.`,
    h1: 'Prezzi semplici',
    lead: 'Inizia gratis. Passa a un piano a pagamento quando FlipLens si ripaga da solo: di solito basta un buon affare per coprire un mese.',
    sections: [
      {
        h2: 'Piani',
        html: `<table><thead><tr><th>Piano</th><th>Prezzo</th><th>Include</th></tr></thead><tbody>${plans
          .map((p) => `<tr><td><strong>${esc(p.name)}</strong></td><td>${p.priceMonthlyMinor ? `${eur(p.priceMonthlyMinor)} / mese` : 'Gratis'}</td><td>${(IT_FEATURES[p.id] ?? []).map(esc).join('<br>')}</td></tr>`)
          .join('')}</tbody></table><p>Prezzi finali, nessun costo nascosto. I pagamenti sono gestiti da Stripe. Puoi disdire quando vuoi dal portale clienti. I consumatori nell'UE hanno 14 giorni per esercitare il diritto di recesso, vedi i <a href="/terms">Termini</a>.</p>`,
      },
      {
        h2: 'Cosa conta come controllo',
        html: `<p>Un controllo è una valutazione: FlipLens analizza il mercato e calcola valore di rivendita, profitto e verdetto. Il riconoscimento da foto o codice a barre è incluso. I controlli si azzerano il 1° di ogni mese. Il confronto Regno Unito vs UE nel risultato non usa un controllo.</p>`,
      },
    ],
    faq: [
      { q: 'Esiste un piano gratuito?', a: `Sì. ${PLANS.free.name} include ${PLANS.free.monthlyValuations} controlli al mese con riconoscimento da foto e codice a barre, profitto e ROI, magazzino e ${PLANS.free.monthlyListings} annunci con IA. Nessuna carta richiesta.` },
      { q: 'Cosa aggiungono i piani a pagamento?', a: paid.map((p) => `${p.name} (${eur(p.priceMonthlyMinor)}/mese): ${(IT_FEATURES[p.id] ?? []).join(', ')}.`).join(' ') },
      { q: 'Posso disdire quando voglio?', a: `Sì. Disdici dal portale clienti nel tuo profilo; il piano resta attivo fino alla fine del mese già pagato.` },
    ],
  },
  {
    path: '/faq',
    kind: 'page',
    crumb: 'FAQ',
    title: 'FAQ FlipLens: controlli del valore di rivendita per chi rivende in Europa',
    description: `Risposte su FlipLens: da dove vengono i prezzi, quali articoli e paesi sono supportati, precisione, privacy, prezzi e installazione dell'app.`,
    h1: 'Domande frequenti',
    lead: 'Risposte brevi su come funziona FlipLens e su cosa può e non può fare.',
    sections: [],
    faq: [
      ...COMMON_FAQ_IT,
      { q: 'FlipLens può controllare un intero tavolo in una volta?', a: `Sì. Scatta una foto di una bancarella, di una scatola o di uno scaffale e FlipLens trova fino a 6 articoli, controlla ciascuno con annunci eBay reali (un controllo per articolo) e mostra per primi gli acquisti migliori. Oppure tieni la fotocamera aperta con il Radar live: mentre ti muovi gli articoli vengono inquadrati con il loro nome, e un tocco ne controlla il prezzo. I prezzi arrivano sempre da un controllo reale, mai da una supposizione. Entrambe le funzioni richiedono l'accesso con Google.` },
      { q: 'Quali paesi copre FlipLens?', a: `I dati di mercato vengono da eBay Germania, Francia, Italia, Spagna e Paesi Bassi, in euro. Se vendi su eBay.co.uk (l'impostazione predefinita se il tuo paese è il Regno Unito), FlipLens usa gli annunci di eBay.co.uk e mostra i prezzi in sterline, con le commissioni per venditori privati del Regno Unito. Nel profilo puoi scegliere eBay.de o eBay.co.uk, qualunque sia il tuo paese. Nel risultato, il confronto Regno Unito vs UE mostra con un tocco lo stesso articolo su eBay.co.uk e sui cinque siti eBay UE affiancati, in sterline e in euro, senza usare un controllo. Per Vinted, Kleinanzeigen e altri marketplace ci sono link per controllare i prezzi da solo.` },
      { q: `Quanto è precisa la stima?`, a: `Dipende dal mercato. Ogni risultato mostra un indice di affidabilità, su quanti annunci si basa e i rischi. Quando i dati non bastano, FlipLens lo dice invece di tirare a indovinare. Nel Magazzino puoi registrare i tuoi prezzi di vendita reali e vedere quanto si avvicinavano le stime.` },
      { q: 'Per quali marketplace vengono calcolate le commissioni?', a: `eBay.de per venditori privati e professionali, eBay.co.uk per venditori privati, Vinted e ritiro di persona con pagamento in contanti. Ogni profilo commissioni mostra quando è stato verificato l'ultima volta.` },
      { q: 'FlipLens può scrivere il mio annuncio?', a: `Sì. Scatta una foto di qualsiasi articolo, anche abbigliamento, e FlipLens scrive titolo, descrizione e testo sulle condizioni nello stile di Vinted, eBay o Kleinanzeigen, nella tua lingua e pronti da copiare. Free include ${PLANS.free.monthlyListings} annunci al mese, Pro ${PLANS.pro.monthlyListings}. FlipLens non pubblica mai nulla al posto tuo.` },
      { q: `Esiste un'app per il telefono?`, a: `FlipLens è una web app che puoi installare sul telefono: apri fliplens.eu e scegli "Aggiungi alla schermata Home" (iPhone) o "Installa app" (Android). Da quel momento si apre a schermo intero come un'app normale.` },
      { q: "C'è un'estensione per il browser?", a: `Sì, per Chrome, Edge e Brave sul computer. In un annuncio su Vinted, Subito, eBay, Kleinanzeigen, leboncoin, Wallapop, Marktplaats, 2dehands o willhaben mostra un pannello FlipLens: con un clic vedi a quanto si rivende l'articolo, il tuo profitto al netto delle commissioni e il prezzo massimo da pagare, con le impostazioni dell'app. Legge solo l'annuncio che apri, e solo dopo il tuo clic. Apri fliplens.eu sul computer, scegli "Aggiungi a Chrome" e accedi una volta nell'app.` },
      { q: 'Perché devo accedere?', a: `I tuoi controlli gratuiti, la cronologia e il piano sono legati al tuo account, così funzionano su tutti i tuoi dispositivi. Accedi con Google con un tocco; non serve creare una password.` },
    ],
  },
  {
    path: '/guides/how-to-check-resale-value',
    kind: 'article',
    crumb: 'Controllare il valore di rivendita',
    parent: GUIDES_PARENT,
    title: `Come controllare il valore di rivendita di un articolo prima di comprarlo (Europa)`,
    description: `Un metodo passo per passo per scoprire a quanto si rivende davvero un articolo usato in Europa, sottrarre commissioni e spedizione e calcolare il prezzo massimo da pagare.`,
    h1: `Come controllare il valore di rivendita prima di comprare`,
    lead: `Al mercatino o su un sito di annunci di solito hai un minuto per decidere. Questo è il metodo che usa chi rivende, ed è proprio quello che FlipLens automatizza.`,
    sections: [
      {
        h2: '1. Individua il modello esatto',
        html: `<p>Le differenze di prezzo tra varianti sono spesso più grandi di quelle tra condizioni diverse. Leggi il numero di modello sull'etichetta, sulla confezione o nelle impostazioni. Controlla la memoria, la generazione del modello, il colore quando conta e, per gli obiettivi, l'innesto. "Cuffie Sony" non è un prezzo; "Sony WH-1000XM4" sì.</p>`,
      },
      {
        h2: '2. Guarda annunci simili, non il primo risultato',
        html: `<p>Cerca il modello esatto su eBay e scarta ciò che non è paragonabile: altre generazioni, accessori venduti da soli, bundle con giochi o obiettivi in più, articoli "per ricambi" e annunci lontani con spedizione cara. Guarda in più paesi: lo stesso articolo può vendersi a prezzi sensibilmente diversi in Germania, Francia o Italia.</p>`,
      },
      {
        h2: '3. Correggi per prezzo richiesto e condizioni',
        html: `<p>La maggior parte degli annunci mostra prezzi richiesti, e gli articoli di solito si vendono a meno. Prendi il centro della fascia realistica, non l'annuncio più caro, e tieni conto delle condizioni: un articolo in "buone condizioni" non spunta un prezzo da "come nuovo". Se esistono solo pochi annunci paragonabili, prendi qualsiasi stima con cautela.</p>`,
      },
      {
        h2: '4. Sottrai commissioni e spedizione',
        html: `<p>Quello che ti resta è il prezzo di vendita meno le commissioni del marketplace e la spedizione che paghi tu. Su eBay.de i venditori privati non pagano commissioni di vendita all'interno della Germania, quelli professionali sì; su Vinted le commissioni le paga l'acquirente. Vedi <a href="${h('/guides/ebay-fees-germany')}">commissioni eBay.de per venditori privati e professionali</a> e <a href="${h('/guides/where-to-sell-used-electronics-europe')}">dove vendere elettronica usata in Europa</a>.</p>`,
      },
      {
        h2: '5. Calcola il tuo prezzo massimo',
        html: `<p>Decidi il rendimento che vuoi, poi dividi quello che ti resta per 1 più quel rendimento. Esempio: una Nintendo Switch OLED che dovrebbe vendersi a 176 €, nessuna commissione di vendita, 6 € di spedizione, quindi ti restano 170 €. Per un rendimento del 40% il massimo che dovresti pagare è 170 € ÷ 1,4 = <strong>121 €</strong>. Tutto ciò che sta sotto è un acquisto; sopra, tratta o lascia perdere.</p>`,
      },
      {
        h2: 'Fallo in pochi secondi con FlipLens',
        html: `<p>FlipLens fa tutti e cinque i passaggi partendo da una foto, un codice a barre o un modello scritto: riconosce la variante esatta, legge annunci eBay simili in cinque paesi UE o su eBay.co.uk, tiene conto di condizioni e prezzi richiesti, sottrae le commissioni del tuo marketplace e la spedizione e mostra il prezzo massimo che conviene pagare. Non hai nemmeno bisogno di conoscere il prezzo del venditore.</p>`,
      },
    ],
    faq: [
      { q: `Come faccio a sapere a quanto si rivende qualcosa?`, a: `Individua il modello esatto, confrontalo con annunci simili nelle stesse condizioni, prendi il centro realistico della fascia invece del prezzo richiesto più alto, poi sottrai commissioni di vendita e spedizione.` },
      { q: `Quanto dovrei pagare un articolo che voglio rivendere?`, a: `Dividi quello che ti resterà dopo commissioni e spedizione per 1 più il rendimento che vuoi. Con 170 € che ti restano e un obiettivo del 40%, paga al massimo 121 €.` },
    ],
  },
  {
    path: '/guides/ebay-fees-germany',
    kind: 'article',
    crumb: 'Commissioni eBay.de',
    parent: GUIDES_PARENT,
    title: 'Commissioni eBay.de nel 2026: venditori privati e professionali',
    description: `Quanto costa vendere su eBay Germania per venditori privati e professionali, con un esempio di come le commissioni cambiano il tuo profitto e il prezzo che puoi pagare per la merce.`,
    h1: 'Commissioni eBay.de nel 2026: venditori privati e professionali',
    lead: `Vendere come privato o come professionista cambia il tuo margine su ogni articolo. Ecco la differenza e come tenerne conto. Verifica sempre le commissioni attuali sulle pagine di eBay prima di farci affidamento.`,
    sections: [
      {
        h2: 'Venditori privati',
        html: `<p>Dal 1° marzo 2023 i venditori privati su eBay.de <strong>non pagano commissioni di vendita</strong> per le vendite all'interno della Germania. Alcuni extra facoltativi, come certe opzioni per gli annunci e la vendita all'estero, possono comunque costare. Fonte: <a href="https://www.ebay.de/help/selling/fees-credits-invoices/gebhren-fr-private-verkufer-die-der-zahlungsabwicklung-teilnehmen?id=4822">guida eBay.de: commissioni per venditori privati</a>.</p>`,
      },
      {
        h2: 'Venditori professionali',
        html: `<p>I venditori professionali pagano una commissione sul valore finale che dipende dalla categoria e dal fatto che l'articolo sia nuovo o usato. Alla nostra ultima verifica (settembre 2026), le percentuali per le categorie coperte da FlipLens erano circa:</p><table><thead><tr><th>Articolo</th><th>Commissione</th></tr></thead><tbody><tr><td>Elettronica usata o ricondizionata</td><td>5%</td></tr><tr><td>Elettronica nuova</td><td>7%</td></tr><tr><td>Accessori</td><td>12%</td></tr><tr><td>Utensili</td><td>13%</td></tr><tr><td>Per ordine oltre 10 €</td><td>+ 0,45 €</td></tr></tbody></table><p>Questi valori vengono da una fonte secondaria e le categorie hanno delle eccezioni, quindi controlla la tabella commissioni aggiornata di eBay per la tua categoria.</p>`,
      },
      {
        h2: 'Esempio: lo stesso articolo, due tipi di venditore',
        html: `<p>Una Nintendo Switch OLED usata si vende a 176 € e paghi 6 € di spedizione.</p><ul><li>Venditore privato: nessuna commissione di vendita, ti restano 170 €. Per un rendimento del 40% puoi pagare fino a 121 €.</li><li>Venditore professionale: circa il 5% (8,80 €) più 0,45 €, ti restano circa 160,75 €. Per un rendimento del 40% puoi pagare fino a circa 114 €.</li></ul><p>Qualche euro di differenza per articolo diventa tanto in un mese di acquisti, quindi imposta correttamente il tuo tipo di venditore in FlipLens: ogni controllo userà le commissioni giuste.</p>`,
      },
      {
        h2: 'Privato o professionale: io cosa sono?',
        html: `<p>Se compri articoli con l'intenzione di rivenderli regolarmente, il diritto fiscale e quello dei consumatori di solito lo considerano un'attività professionale, anche se hai iniziato per gioco. Questa è un'informazione generale, non una consulenza legale o fiscale: verifica le regole del tuo paese o chiedi a un commercialista.</p>`,
      },
    ],
    faq: [
      { q: 'I venditori privati pagano commissioni su eBay.de?', a: `Nessuna commissione di vendita per le vendite all'interno della Germania dal 1° marzo 2023. Gli extra facoltativi e la vendita all'estero possono costare.` },
      { q: 'Quanto pagano i venditori professionali su eBay.de?', a: `Una commissione sul valore finale in base a categoria e condizioni; a settembre 2026 circa il 5% per l'elettronica usata e il 7% per quella nuova, più 0,45 € per ordine oltre 10 €. Controlla la tabella commissioni aggiornata di eBay.` },
    ],
  },
  {
    path: '/guides/where-to-sell-used-electronics-europe',
    kind: 'article',
    crumb: 'Dove vendere elettronica usata',
    parent: GUIDES_PARENT,
    title: 'Dove vendere elettronica usata in Europa: eBay, Vinted, Kleinanzeigen o di persona',
    description: `eBay, Vinted, Kleinanzeigen e vendita in contanti di persona a confronto per l'elettronica usata in Europa: chi paga le commissioni, pubblico, velocità e quando conviene ciascuno.`,
    h1: 'Dove vendere elettronica usata in Europa',
    lead: `Il marketplace migliore dipende dall'articolo, da quanto in fretta vuoi vendere e da chi paga le commissioni. Un confronto rapido per chi rivende in Europa.`,
    sections: [
      {
        h2: 'eBay: il pubblico più ampio',
        html: `<p>eBay ha siti nazionali in tutta Europa (Germania, Regno Unito, Francia, Italia, Spagna, Paesi Bassi e altri) e acquirenti che cercano il modello esatto. È adatto ad articoli con un numero di modello chiaro: console, telefoni, cuffie, fotocamere e obiettivi. In Germania i venditori privati non pagano commissioni di vendita all'interno del paese; quelli professionali pagano una commissione in base alla categoria. Vedi <a href="${h('/guides/ebay-fees-germany')}">commissioni eBay.de</a>.</p>`,
      },
      {
        h2: 'Vinted: nessuna commissione per chi vende',
        html: `<p>Su Vinted chi vende non paga commissioni: l'acquirente paga in più una commissione di protezione acquisti e la spedizione. Per questo il tuo prezzo sembra più alto all'acquirente, e potresti dover mettere gli articoli in vendita a un prezzo un po' più basso. Funziona bene per elettronica piccola e facile da spedire e per il gaming.</p>`,
      },
      {
        h2: 'Kleinanzeigen: locale in Germania',
        html: `<p>Kleinanzeigen è il grande sito di annunci in Germania. Gli annunci base per i venditori privati sono gratuiti, molti acquirenti preferiscono il ritiro di persona e si aspettano di trattare, quindi parti un po' sopra il tuo prezzo obiettivo. Ottimo per articoli ingombranti o pesanti, dove la spedizione si mangerebbe il margine.</p>`,
      },
      {
        h2: 'Ritiro di persona e contanti',
        html: `<p>Niente commissioni e niente spedizione, ma un pubblico più piccolo e vendite più lente. Conviene per articoli grandi o quando hai già un acquirente.</p>`,
      },
      {
        h2: 'Confronta prima di comprare',
        html: `<p>Imposta in FlipLens il marketplace su cui vendi di solito e ogni controllo userà le sue commissioni e regole di spedizione. Il risultato rimanda anche a Vinted, Kleinanzeigen e altri marketplace, così puoi vedere da solo i prezzi locali.</p>`,
      },
    ],
    faq: [
      { q: `Conviene vendere elettronica su eBay o su Vinted?`, a: `eBay raggiunge più acquirenti che cercano il modello esatto ed è adatto ad articoli di valore più alto; su Vinted chi vende non paga commissioni perché l'acquirente paga la protezione acquisti, il che funziona bene per gli articoli piccoli. Confronta quanto ti resta dopo commissioni e spedizione.` },
      { q: 'Chi paga le commissioni su Vinted?', a: `L'acquirente. Vinted addebita all'acquirente una commissione di protezione acquisti e la spedizione; chi vende riceve il prezzo indicato nell'annuncio.` },
    ],
  },
  {
    path: '/guides/flea-market-reselling-checklist',
    kind: 'article',
    crumb: 'Checklist per il mercatino',
    parent: GUIDES_PARENT,
    title: `Checklist per rivendere dal mercatino: cosa controllare prima di comprare elettronica`,
    description: `Una checklist pratica per comprare elettronica, console e fotocamere usate ai mercatini dell'usato per rivenderle: identificazione, test, completezza, blocchi e prezzo.`,
    h1: 'Checklist per rivendere dal mercatino',
    lead: `La maggior parte degli acquisti sbagliati non è troppo cara: è la variante sbagliata, incompleta o bloccata. Ripassa questa lista prima di tirare fuori i soldi.`,
    sections: [
      {
        h2: 'Prima di uscire',
        html: `<ul><li>Carica il telefono e porta un power bank: controllerai i prezzi sul posto.</li><li>Porta banconote di piccolo taglio e monete, la mattina presto i venditori hanno raramente il resto.</li><li>Conosci il tuo prezzo massimo per tipo di articolo, oppure controllalo con FlipLens in pochi secondi.</li></ul>`,
      },
      {
        h2: `Identifica l'articolo esatto`,
        html: `<ul><li>Trova il numero di modello sull'etichetta, nel vano batteria o sulla confezione. Fagli una foto.</li><li>Controlla la memoria, la generazione e, per gli obiettivi, l'innesto.</li><li>I codici a barre sulle confezioni identificano la variante esatta più in fretta.</li></ul>`,
      },
      {
        h2: 'Prova quello che puoi',
        html: `<ul><li>Si accende? Chiedi una presa o porta power bank e cavo.</li><li>Schermi: pixel morti, burn-in, crepe. Porte: le porte di ricarica traballanti sono frequenti.</li><li>Controller e Joy-Con: controlla il drift degli stick.</li><li>Fotocamere e obiettivi: guarda attraverso l'obiettivo controluce per cercare velature, funghi e graffi; verifica che l'otturatore scatti.</li><li>Telefoni e tablet: se possibile controlla lo stato della batteria nelle impostazioni.</li></ul>`,
      },
      {
        h2: 'Verifica che non sia bloccato',
        html: `<p>Telefoni, tablet, laptop e smartwatch possono essere legati all'account del proprietario precedente (per esempio il Blocco attivazione di Apple). Un dispositivo bloccato vale una frazione del suo prezzo. Chiedi al venditore di mostrarti che è disconnesso dall'account o di ripristinarlo davanti a te.</p>`,
      },
      {
        h2: 'La completezza aggiunge valore',
        html: `<p>Scatola originale, caricabatterie, cavi, tappi degli obiettivi e manuali aiutano a vendere più in fretta e a un prezzo più alto. Caricabatterie mancanti e cavi proprietari ti costano soldi da sostituire.</p>`,
      },
      {
        h2: 'Decidi in base ai numeri',
        html: `<p>Confronta il prezzo richiesto con il prezzo massimo che conviene pagare dopo commissioni e spedizione. Se il venditore chiede di più, tratta fino a quel prezzo o lascia perdere. Vedi <a href="${h('/guides/how-to-check-resale-value')}">come controllare il valore di rivendita</a>.</p>`,
      },
    ],
    faq: [
      { q: `Cosa devo controllare prima di comprare elettronica usata da rivendere?`, a: `Il modello e la variante esatti, che si accenda e funzioni, le condizioni di schermo e porte, che non sia legato all'account di qualcun altro, quali accessori sono inclusi e che il prezzo sia sotto il tuo massimo dopo commissioni e spedizione.` },
    ],
  },
  {
    path: '/vinted-listing-generator',
    kind: 'page',
    crumb: 'Generatore di annunci Vinted',
    cta: LISTING_CTA_IT,
    title: 'Generatore di annunci Vinted: titolo e descrizione da una foto',
    description: `Scatta una foto di qualsiasi cosa tu venda, anche abbigliamento, e ottieni titolo, descrizione e hashtag per Vinted nella tua lingua. ${PLANS.free.monthlyListings} annunci al mese gratis.`,
    h1: 'Generatore di annunci Vinted',
    lead: `Scatta una foto dell'articolo e ottieni titolo, descrizione e hashtag pronti da incollare su Vinted. Funziona per abbigliamento, scarpe, borse, casa, giocattoli e tecnologia, nella tua lingua.`,
    sections: [
      {
        h2: 'Come funziona',
        html: `<ol><li>Scatta da una a tre foto: davanti, dietro e l'etichetta del marchio o della taglia funzionano meglio.</li><li>Scegli le condizioni e aggiungi ciò che le foto non mostrano, come taglia, materiale o un piccolo difetto.</li><li>Copia titolo e descrizione, apri Vinted e incolla.</li></ol>`,
      },
      {
        h2: 'Cosa scrive',
        html: `<p>Per Vinted: un titolo breve e naturale (marchio, articolo e un dettaglio chiave), una descrizione cordiale e onesta, una frase sulle condizioni e qualche parola chiave e hashtag pertinenti. La stessa foto può diventare anche un annuncio eBay (titolo con le parole chiave in testa, descrizione strutturata) o un annuncio su Kleinanzeigen (diretto, con la consueta nota sulla vendita tra privati).</p>`,
      },
      {
        h2: 'Onesto per scelta',
        html: `<p>Il generatore descrive solo ciò che si vede nelle tue foto o che hai scritto nei dettagli. Non inventa taglia, materiale, marchio o misure. Quando manca qualcosa che gli acquirenti chiedono spesso, come la taglia o le misure, te lo dice, così puoi aggiungerlo prima di pubblicare.</p>`,
      },
      {
        h2: 'E il prezzo?',
        html: `<p>FlipLens non legge i dati di Vinted. Dopo aver scritto il tuo annuncio, rimanda ad articoli simili su Vinted, così puoi confrontare i prezzi con un tocco. Per elettronica, giochi e fotocamere, FlipLens può anche <a href="${h('/how-it-works')}">stimare il valore di rivendita</a> in base agli annunci eBay in cinque paesi UE o su eBay.co.uk.</p>`,
      },
      {
        h2: 'Piani',
        html: `<p>Free: ${PLANS.free.monthlyListings} annunci al mese. Pro (${eur(PLANS.pro.priceMonthlyMinor)}/mese): ${PLANS.pro.monthlyListings} annunci e ${PLANS.pro.monthlyValuations} controlli del prezzo. Reseller (${eur(PLANS.reseller.priceMonthlyMinor)}/mese): fino a ${num(PLANS.reseller.monthlyListings)}. Vedi i <a href="${h('/pricing')}">prezzi</a>.</p>`,
      },
    ],
    faq: [
      { q: 'Il generatore di annunci Vinted è gratuito?', a: `Sì, ${PLANS.free.monthlyListings} annunci al mese sono gratis dopo l'accesso con Google. Pro ne include ${PLANS.pro.monthlyListings} al mese.` },
      { q: 'In quali lingue scrive?', a: 'Inglese, tedesco, francese, italiano, spagnolo, olandese, polacco, sloveno, croato, ceco, portoghese e svedese.' },
      { q: 'Pubblica lui su Vinted al posto mio?', a: `No. Copi il testo e lo incolli tu su Vinted. FlipLens è indipendente e non è affiliato a Vinted.` },
      { q: 'Le mie foto vengono salvate?', a: `No. Le foto servono solo a scrivere l'annuncio e non vengono salvate.` },
    ],
  },
  {
    path: '/guides/how-to-sell-on-vinted',
    kind: 'article',
    crumb: 'Come vendere su Vinted',
    parent: GUIDES_PARENT,
    cta: LISTING_CTA_IT,
    title: 'Come vendere su Vinted: commissioni, annunci che vendono e prezzi',
    description: `Una guida pratica per vendere su Vinted in Europa: chi paga le commissioni, come fotografare e descrivere gli articoli, come fissare il prezzo e come spedire.`,
    h1: 'Come vendere su Vinted',
    lead: `Vinted è il più grande marketplace dell'usato per abbigliamento in Europa e funziona anche per piccola elettronica e articoli per la casa. Foto chiare, una descrizione onesta e il prezzo giusto fanno quasi tutto il lavoro.`,
    sections: [
      {
        h2: 'Chi paga le commissioni',
        html: `<p>Su Vinted chi vende non paga commissioni di vendita. L'acquirente paga una commissione di Protezione acquisti e la spedizione in aggiunta al tuo prezzo, quindi il totale che vede è più alto di quanto hai chiesto. Chi vende può usare promozioni a pagamento facoltative, come dare visibilità a un articolo. Le commissioni possono variare da paese a paese e cambiare nel tempo, quindi controlla le regole attuali nel centro assistenza di Vinted.</p>`,
      },
      {
        h2: 'Foto che fanno cliccare',
        html: `<ul><li>Usa la luce del giorno e uno sfondo neutro.</li><li>Mostra il davanti, il retro, l'etichetta del marchio e quella della taglia.</li><li>Fotografa i difetti da vicino: gli acquirenti si fidano di chi li mostra.</li><li>La prima foto è quella che le persone vedono nella ricerca, quindi scegli la più chiara.</li></ul>`,
      },
      {
        h2: 'Titolo e descrizione',
        html: `<p>Inizia il titolo con marchio e articolo, poi un dettaglio chiave come taglia o colore: "Jeans Levi's 501 W32 L32, blu scuro". Nella descrizione indica la taglia e, per l'abbigliamento, le misure (per esempio torace e lunghezza), il materiale indicato sull'etichetta di lavaggio, la vestibilità e le condizioni, difetti compresi. Aggiungi qualche parola che le persone cercano, come lo stile o l'occasione.</p>`,
      },
      {
        h2: 'Scegli le condizioni con onestà',
        html: `<p>Vinted ti chiede di scegliere le condizioni, da "Nuovo con cartellino" a "Discrete". Indicare condizioni migliori di quelle reali è una causa frequente di contestazioni e resi. Nel dubbio, scegli quella più bassa e spiega nella descrizione.</p>`,
      },
      {
        h2: 'Prezzo',
        html: `<p>Cerca su Vinted lo stesso marchio e articolo in condizioni simili e fissa il prezzo in quella fascia. Molti acquirenti fanno offerte, quindi lascia un po' di margine. Gli sconti sui lotti spingono gli acquirenti a prendere più articoli in un solo pacco, e ti risparmiano qualche viaggio all'ufficio postale.</p>`,
      },
      {
        h2: 'Spedizione',
        html: `<p>Imballa bene gli articoli, spedisci entro il tempo che Vinted ti dà e conserva la ricevuta di spedizione finché l'acquirente non ha confermato l'ordine.</p>`,
      },
      {
        h2: 'Scrivi annunci più in fretta',
        html: `<p>Il <a href="${h('/vinted-listing-generator')}">generatore di annunci di FlipLens</a> trasforma una foto in titolo e descrizione per Vinted nella tua lingua e ti dice cosa chiederanno gli acquirenti, come taglia o misure.</p>`,
      },
    ],
    faq: [
      { q: 'Chi vende paga commissioni su Vinted?', a: `Nessuna commissione di vendita. L'acquirente paga una commissione di Protezione acquisti e la spedizione in aggiunta al prezzo. Le promozioni facoltative costano a parte.` },
      { q: 'Come scrivo una buona descrizione per Vinted?', a: `Indica marchio, taglia e misure, materiale, vestibilità e condizioni oneste, difetti compresi, più qualche parola che gli acquirenti cercano.` },
    ],
  },
  {
    path: '/best-resale-value-apps',
    kind: 'article',
    crumb: 'Modi per controllare il valore di rivendita',
    title: 'Come controllare il valore di rivendita in Europa: app e metodi a confronto (2026)',
    description: `Un confronto onesto dei modi per scoprire quanto vale un articolo usato in Europa: FlipLens, articoli venduti su eBay, ricerche su Vinted e Kleinanzeigen, Google Lens e offerte di permuta.`,
    h1: 'Come controllare il valore di rivendita in Europa: app e metodi a confronto',
    lead: `Non esiste una fonte perfetta per i prezzi dell'usato. Ciascuno dei metodi qui sotto risponde a una domanda leggermente diversa. Ecco in cosa è bravo ognuno, dove è carente e quando usarlo.`,
    sections: [
      {
        h2: 'In sintesi',
        html: `<table><thead><tr><th>Metodo</th><th>Velocità</th><th>Dati</th><th>Prezzi di vendita o richiesti</th><th>Paesi</th><th>Costo</th></tr></thead><tbody><tr><td>FlipLens</td><td>Secondi, da foto, codice a barre o nome del modello</td><td>Annunci eBay attivi, filtrati e adattati alle condizioni</td><td>Prezzi richiesti, corretti al ribasso</td><td>Germania, Francia, Italia, Spagna, Paesi Bassi insieme, oppure Regno Unito</td><td>10 controlli gratis al mese, piani a pagamento per averne di più</td></tr><tr><td>Filtro eBay "Oggetti venduti"</td><td>Qualche minuto per articolo</td><td>Vendite concluse su un solo sito eBay</td><td>Prezzi di vendita</td><td>Un paese alla volta</td><td>Gratis</td></tr><tr><td>Ricerche su Vinted, Kleinanzeigen</td><td>Qualche minuto</td><td>Annunci locali attuali</td><td>Prezzi richiesti</td><td>Un marketplace e una zona</td><td>Gratis</td></tr><tr><td>Google Lens, poi una ricerca sul marketplace</td><td>Veloce da riconoscere, lento da valutare</td><td>Corrispondenza visiva, poi la tua ricerca</td><td>Quello che trovi</td><td>Tutti</td><td>Gratis</td></tr><tr><td>Siti di permuta e riacquisto</td><td>Offerta immediata</td><td>Il listino prezzi di chi compra</td><td>Un'offerta per comprare da te</td><td>Variabile</td><td>Gratis</td></tr></tbody></table>`,
      },
      {
        h2: 'FlipLens',
        html: `<p>FlipLens riconosce il modello esatto da una foto, un codice a barre o un nome scritto, legge annunci eBay attivi e paragonabili in cinque paesi UE o su eBay.co.uk, scarta altre varianti, bundle e articoli guasti, tiene conto delle condizioni e restituisce una fascia di rivendita, il tuo profitto dopo commissioni e spedizione e il massimo che dovresti pagare. <strong>Ideale per:</strong> decisioni d'acquisto rapide ai mercatini e sui siti di annunci, quando non vuoi fare ricerche a mano per ogni articolo. <strong>Limiti:</strong> lavora sui prezzi richiesti, non su prezzi di vendita confermati; copre elettronica di consumo, gaming, fotocamere ed elettroutensili, non la moda; se gli annunci paragonabili sono troppo pochi lo dice invece di stimare. Vedi <a href="${h('/how-it-works')}">come funziona</a>.</p>`,
      },
      {
        h2: 'Ricerca su eBay con il filtro "Oggetti venduti"',
        html: `<p>Su eBay puoi filtrare una ricerca per mostrare gli articoli effettivamente venduti. <strong>Meglio di FlipLens per:</strong> mostrare i prezzi finali reali invece di quelli richiesti. <strong>Svantaggi:</strong> controlli un sito eBay alla volta, devi scorrere tu i risultati per scartare altre generazioni, bundle e articoli guasti, e devi comunque sottrarre commissioni e spedizione per conoscere il tuo profitto. Vale la pena per gli articoli costosi prima di impegnarti.</p>`,
      },
      {
        h2: 'Cercare su Vinted o Kleinanzeigen',
        html: `<p>Cercare sul marketplace dove pensi di vendere ti mostra la concorrenza che troverai. <strong>Ideale per:</strong> prezzi locali e articoli che si vendono soprattutto tramite annunci. <strong>Svantaggi:</strong> vedi solo prezzi richiesti, e gli annunci che restano invenduti per settimane spingono il quadro verso l'alto. FlipLens rimanda a queste ricerche da ogni risultato, così puoi confrontare con un tocco.</p>`,
      },
      {
        h2: 'Google Lens per riconoscere un articolo sconosciuto',
        html: `<p>Quando non sai cos'è un articolo, una ricerca per immagini può trovarne il nome o il modello. <strong>Ideale per:</strong> articoli insoliti, pezzi vintage e qualsiasi cosa senza un'etichetta leggibile. <strong>Svantaggi:</strong> riconosce, non valuta; devi comunque cercare sui marketplace e giudicare da solo condizioni e varianti.</p>`,
      },
      {
        h2: 'Offerte di permuta e riacquisto',
        html: `<p>Alcuni negozi e siti fanno un'offerta immediata per comprare il tuo telefono, console o fotocamera usati. <strong>Ideale per:</strong> vendere in fretta e senza fatica. <strong>Svantaggi:</strong> l'offerta è ciò che chi compra è disposto a pagare per poi rivendere a sua volta, quindi di solito è ben al di sotto di quanto otterresti vendendo tra privati. È una soglia minima, non un valore di rivendita.</p>`,
      },
      {
        h2: 'Quando usare cosa',
        html: `<ul><li><strong>Davanti a una bancarella, pochi secondi per decidere:</strong> FlipLens.</li><li><strong>Un articolo costoso prima di comprarlo:</strong> prima FlipLens, poi il filtro "Oggetti venduti" di eBay per conferma.</li><li><strong>Dare un prezzo al tuo annuncio:</strong> guarda cosa è in vendita in questo momento sul tuo marketplace.</li><li><strong>Non hai idea di cosa sia l'articolo:</strong> prima Google Lens.</li><li><strong>Vuoi solo liberartene:</strong> un'offerta di permuta, sapendo che è la cifra più bassa.</li></ul>`,
      },
    ],
    faq: [
      { q: 'Qual è il modo più preciso per trovare il valore di rivendita?', a: `I prezzi di vendita recenti per il modello esatto nelle stesse condizioni, al netto di commissioni e spedizione. Il filtro "Oggetti venduti" di eBay li mostra un paese alla volta; FlipLens dà una stima rapida su cinque paesi UE o su eBay.co.uk partendo dagli annunci attivi.` },
      { q: 'Perché le offerte di permuta sono così basse?', a: `Chi compra deve rivendere l'articolo e guadagnarci, quindi l'offerta è inferiore al prezzo di rivendita tra privati.` },
      { q: 'Esiste un modo gratuito per controllare il valore di rivendita?', a: `Sì. Le ricerche sui marketplace e il filtro "Oggetti venduti" di eBay sono gratuiti, e FlipLens include 10 controlli gratis al mese.` },
    ],
  },
  {
    path: '/guides/how-much-is-my-console-worth',
    kind: 'article',
    crumb: 'Quanto vale la mia console',
    parent: GUIDES_PARENT,
    title: 'Quanto vale la mia console? Console, portatili, controller e giochi',
    description: `Cosa determina il valore di rivendita di console, console portatili, controller e giochi usati in Europa, gli errori che costano soldi e come controllare il prezzo in pochi secondi.`,
    h1: 'Quanto vale la mia console?',
    lead: `Il materiale da gaming si rivende bene, ma due console che sembrano identiche possono valere cifre molto diverse. Questi sono i dettagli che decidono il prezzo.`,
    sections: [
      {
        h2: 'Cosa determina il prezzo',
        html: `<ul><li><strong>Modello e revisione esatti:</strong> per esempio un modello standard rispetto a una versione OLED o Slim, o un'edizione con lettore rispetto a una digitale. Te lo dice il numero di modello sotto o sul retro.</li><li><strong>Memoria:</strong> più memoria interna di solito vale di più.</li><li><strong>Condizioni:</strong> graffi sullo schermo, plastica ingiallita, ventole rumorose e drift degli stick dei controller abbassano il prezzo.</li><li><strong>Completezza:</strong> scatola originale, controller, dock, cavi e alimentatore. Una console senza alimentatore è più difficile da vendere.</li><li><strong>Account e ban:</strong> una console ancora collegata all'account di qualcun altro, o bannata dai servizi online, vale molto meno.</li></ul>`,
      },
      {
        h2: 'Controller e giochi',
        html: `<p>Nei controller si controllano il drift degli stick e i tasti consumati; i controller originali si vendono meglio di quelli di terze parti. Per i giochi conta l'edizione (standard, da collezione, regione) e se custodia, manuale ed eventuali codici sono completi. I giochi sigillati e i giochi retro completi di scatola sono un mercato a sé: confronta cose simili tra loro.</p>`,
      },
      {
        h2: 'Errori comuni',
        html: `<ul><li>Confrontare il tuo articolo con un bundle che include giochi o controller in più.</li><li>Prendere il prezzo richiesto più alto come valore.</li><li>Dimenticare la spedizione: le console sono pesanti e ingombranti.</li><li>Comprare una console portatile senza provare schermo e tasti.</li></ul>`,
      },
      {
        h2: 'Checklist rapida',
        html: `<ul><li>Numero di modello e memoria annotati.</li><li>Si accende, legge i dischi (se ha un lettore), i controller si collegano.</li><li>Disconnessa da tutti gli account o ripristinata alle impostazioni di fabbrica.</li><li>Alimentatore e cavi inclusi.</li><li>Prezzo confrontato con lo stesso modello nelle stesse condizioni.</li></ul>`,
      },
      {
        h2: 'Dove vendere e come controllare in fretta',
        html: `<p>Le console si vendono bene su eBay e di persona; vedi <a href="${h('/guides/where-to-sell-used-electronics-europe')}">dove vendere elettronica usata in Europa</a>. Per controllare una console in pochi secondi, scansiona il codice a barre o scrivi il modello in FlipLens: confronta gli annunci in cinque paesi UE o su eBay.co.uk e ti mostra il massimo che dovresti pagare. <a href="${h('/how-it-works')}">Come funziona</a>.</p>`,
      },
    ],
    faq: [
      { q: 'Come scopro quale modello di console ho?', a: `Cerca il numero di modello sotto o sul retro della console, oppure nelle impostazioni di sistema. Ti dice la versione esatta e spesso anche la memoria.` },
      { q: 'La scatola originale conta?', a: `Sì. Una console completa di scatola, controller e cavi di solito si vende più in fretta e a un prezzo più alto della sola console.` },
    ],
  },
  {
    path: '/guides/resale-value-cameras-lenses',
    kind: 'article',
    crumb: 'Fotocamere e obiettivi',
    parent: GUIDES_PARENT,
    title: 'Valore di rivendita di fotocamere e obiettivi usati: cosa controllare prima di comprare',
    description: `Cosa determina il valore di rivendita di un corpo macchina o di un obiettivo usato in Europa: innesto, numero di scatti, condizioni di sensore e lenti, completezza e regione, più una checklist rapida.`,
    h1: 'Valore di rivendita di fotocamere e obiettivi usati',
    lead: `L'attrezzatura fotografica mantiene il valore meglio della maggior parte dell'elettronica, ma un solo problema, come i funghi in un obiettivo, può renderla quasi priva di valore. Controlla questi punti prima di pagare.`,
    sections: [
      {
        h2: 'Cosa determina il prezzo di un corpo macchina',
        html: `<ul><li><strong>Modello esatto:</strong> le generazioni della stessa serie hanno valori molto diversi.</li><li><strong>Numero di scatti:</strong> quante foto ha già fatto la fotocamera. Un numero alto ne abbassa il valore; molte fotocamere ti permettono di leggerlo dai file o dal menu.</li><li><strong>Sensore e schermo:</strong> graffi, pixel morti e polvere che non va via.</li><li><strong>Completezza:</strong> batteria, caricabatterie, tracolla, tappi e scatola.</li><li><strong>Regione e lingua:</strong> alcuni modelli d'importazione hanno menu o condizioni di garanzia diversi.</li></ul>`,
      },
      {
        h2: 'Cosa determina il prezzo di un obiettivo',
        html: `<ul><li><strong>Innesto:</strong> la stessa lunghezza focale esiste per innesti diversi (per esempio Canon RF ed EF, Sony E/FE, Nikon Z e F). Confronta solo lo stesso innesto.</li><li><strong>Condizioni ottiche:</strong> funghi, velature, separazione delle lenti e graffi profondi riducono molto il valore. Punta una luce attraverso l'obiettivo dal retro.</li><li><strong>Meccanica:</strong> l'autofocus funziona, le ghiere di zoom e messa a fuoco girano fluide, le lamelle del diaframma sono pulite e asciutte.</li><li><strong>Versione:</strong> molti obiettivi esistono in più versioni (per esempio con o senza stabilizzazione).</li></ul>`,
      },
      {
        h2: 'Errori comuni',
        html: `<ul><li>Confrontare un obiettivo con la stessa lunghezza focale ma un innesto o una versione diversi.</li><li>Non provare l'autofocus su un corpo macchina.</li><li>Non accorgersi dei funghi perché l'obiettivo non è stato guardato controluce.</li><li>Ignorare il numero di scatti di un corpo che sembra pulito.</li></ul>`,
      },
      {
        h2: 'Checklist rapida',
        html: `<ul><li>Modello, innesto e versione annotati.</li><li>Obiettivo controllato controluce per funghi e velature.</li><li>Il corpo si accende, scatta una foto, numero di scatti noto se possibile.</li><li>Batteria e caricabatterie inclusi.</li></ul>`,
      },
      {
        h2: 'Dove vendere e come controllare in fretta',
        html: `<p>Fotocamere e obiettivi si vendono bene su eBay in tutta Europa; vedi <a href="${h('/guides/where-to-sell-used-electronics-europe')}">dove vendere elettronica usata in Europa</a>. FlipLens legge modello e innesto da una foto dell'etichetta o del barilotto dell'obiettivo e confronta gli annunci in cinque paesi UE o su eBay.co.uk. <a href="${h('/how-it-works')}">Come funziona</a>.</p>`,
      },
    ],
    faq: [
      { q: 'Come controllo se un obiettivo usato ha i funghi?', a: `Punta una luce forte attraverso l'obiettivo dal retro e cerca filamenti, macchie o una velatura lattiginosa all'interno delle lenti.` },
      { q: 'Il numero di scatti conta quando rivendo?', a: `Sì. Gli acquirenti lo confrontano con la durata prevista dell'otturatore per quel modello, quindi un numero basso aiuta il prezzo.` },
    ],
  },
  {
    path: '/guides/resale-value-headphones',
    kind: 'article',
    crumb: 'Cuffie',
    parent: GUIDES_PARENT,
    title: 'Valore di rivendita di cuffie e auricolari usati: generazioni, batteria e igiene',
    description: `Cosa determina il valore di rivendita di cuffie e auricolari usati in Europa: generazione esatta, usura della batteria, cuscinetti, completezza e igiene, più una checklist rapida.`,
    h1: 'Valore di rivendita di cuffie e auricolari usati',
    lead: `Le cuffie più popolari si rivendono in fretta, ma le generazioni si somigliano e le batterie si consumano. Questi sono i dettagli che gli acquirenti controllano.`,
    sections: [
      {
        h2: 'Cosa determina il prezzo',
        html: `<ul><li><strong>Generazione esatta:</strong> modelli della stessa serie, come Sony WH-1000XM4 e WH-1000XM5, o diverse generazioni di AirPods, si vendono a prezzi diversi. Controlla il numero di modello sull'archetto, sulla custodia o nelle impostazioni.</li><li><strong>Batteria:</strong> cuffie e auricolari wireless perdono capacità col tempo; un'autonomia sensibilmente ridotta ne abbassa il valore.</li><li><strong>Cuscinetti e gommini:</strong> cuscinetti consumati o che si sfaldano allontanano gli acquirenti, ma spesso si possono sostituire.</li><li><strong>Completezza:</strong> custodia, cavo, adattatore e scatola.</li><li><strong>Autenticità:</strong> gli auricolari più popolari vengono spesso contraffatti; numeri di serie e comportamento durante l'abbinamento aiutano a capirlo.</li></ul>`,
      },
      {
        h2: 'Igiene e auricolari',
        html: `<p>Molti acquirenti sono diffidenti verso i prodotti in-ear usati. Puliscili con cura, sostituisci i gommini in silicone se puoi e scrivilo nell'annuncio. Un solo auricolare mancante o una custodia di ricarica mancante rendono un set molto più difficile da vendere.</p>`,
      },
      {
        h2: 'Errori comuni',
        html: `<ul><li>Confondere due generazioni quasi identiche.</li><li>Non provare la cancellazione del rumore, i microfoni ed entrambi i lati.</li><li>Comprare auricolari ancora collegati all'account di qualcun altro.</li></ul>`,
      },
      {
        h2: 'Checklist rapida',
        html: `<ul><li>Numero di modello e generazione confermati.</li><li>Entrambi i lati funzionano, cancellazione del rumore e microfono provati.</li><li>La batteria tiene la carica.</li><li>Custodia, cavo e gommini inclusi.</li><li>Rimossi dall'account del proprietario precedente.</li></ul>`,
      },
      {
        h2: 'Dove vendere e come controllare in fretta',
        html: `<p>Le cuffie si vendono bene su eBay e Vinted; vedi <a href="${h('/guides/where-to-sell-used-electronics-europe')}">dove vendere elettronica usata in Europa</a>. In FlipLens basta una foto dell'etichetta o il codice a barre della scatola per riconoscere la generazione e confrontare i prezzi in cinque paesi UE o su eBay.co.uk. <a href="${h('/how-it-works')}">Come funziona</a>.</p>`,
      },
    ],
    faq: [
      { q: 'Come distinguo le generazioni di cuffie?', a: `Leggi il numero di modello stampato sull'archetto, sulla custodia o sulla scatola, oppure nell'app di accompagnamento o nelle impostazioni Bluetooth.` },
      { q: 'Posso vendere auricolari usati?', a: `Sì, ma puliscili, sostituisci i gommini se puoi e descrivi le condizioni con onestà. I set completi di custodia di ricarica si vendono meglio.` },
    ],
  },
  {
    path: '/guides/sell-used-phone-europe',
    kind: 'article',
    crumb: 'Vendere un telefono usato',
    parent: GUIDES_PARENT,
    title: 'Vendere un telefono usato in Europa: cosa decide il prezzo e cosa controllare',
    description: `Cosa determina il valore di rivendita di uno smartphone usato in Europa: modello, memoria, stato della batteria, blocchi dell'account e dell'operatore, condizioni, più una checklist prima di comprare o vendere.`,
    h1: 'Vendere un telefono usato in Europa',
    lead: `I telefoni sono l'elettronica usata più comune, e quella su cui è più facile sbagliare. Un telefono bloccato o la memoria sbagliata possono trasformare un buon affare in una perdita.`,
    sections: [
      {
        h2: 'Cosa determina il prezzo',
        html: `<ul><li><strong>Modello esatto:</strong> le versioni standard, Plus, Pro e Max hanno valori molto diversi.</li><li><strong>Memoria:</strong> più memoria vale di più. Controllala nelle impostazioni, non solo sulla scatola.</li><li><strong>Stato della batteria:</strong> molti telefoni mostrano lo stato della batteria nelle impostazioni; una batteria debole abbassa il prezzo.</li><li><strong>Condizioni:</strong> graffi o crepe sullo schermo, vetro posteriore, ammaccature del telaio, lenti delle fotocamere, tasti e porte.</li><li><strong>Completezza:</strong> scatola e cavo aiutano un po'; conta soprattutto il telefono.</li></ul>`,
      },
      {
        h2: `Blocchi dell'account e blocchi dell'operatore`,
        html: `<p>Un telefono ancora collegato all'account del proprietario precedente (per esempio il Blocco attivazione di Apple o un account Google dopo un ripristino) non può essere configurato da un nuovo proprietario e vale solo una frazione del prezzo. Assicurati che il venditore rimuova l'account e ripristini il telefono davanti a te. Controlla anche se il telefono è bloccato su un operatore: i telefoni sbloccati si vendono a più acquirenti.</p>`,
      },
      {
        h2: 'Errori comuni',
        html: `<ul><li>Comprare un telefono ancora collegato a un account.</li><li>Confrontare i prezzi di una memoria o di una versione diversa.</li><li>Non controllare se lo schermo è stato sostituito o non è originale.</li><li>Ignorare lo stato della batteria.</li></ul>`,
      },
      {
        h2: 'Checklist rapida',
        html: `<ul><li>Modello e memoria confermati nelle impostazioni.</li><li>Disconnesso da tutti gli account e ripristinato alle impostazioni di fabbrica.</li><li>Non bloccato su un operatore.</li><li>Stato della batteria controllato.</li><li>Schermo, fotocamere, altoparlanti, microfono e porta di ricarica provati.</li></ul>`,
      },
      {
        h2: 'Dove vendere e come controllare in fretta',
        html: `<p>I telefoni si vendono su eBay, sui siti di annunci e su Vinted; vedi <a href="${h('/guides/where-to-sell-used-electronics-europe')}">dove vendere elettronica usata in Europa</a>. FlipLens riconosce il modello da una foto o da un codice a barre, ti permette di impostare la memoria e confronta gli annunci in cinque paesi UE o su eBay.co.uk. <a href="${h('/how-it-works')}">Come funziona</a>.</p>`,
      },
    ],
    faq: [
      { q: 'Cosa devo controllare prima di comprare un telefono usato?', a: `Che sia disconnesso da tutti gli account e ripristinato, che non sia bloccato su un operatore, che abbia la memoria che ti aspetti, una batteria in buono stato e che schermo, fotocamere e porta di ricarica funzionino.` },
      { q: 'La memoria cambia il valore di rivendita?', a: `Sì. Lo stesso modello con più memoria di solito si vende a un prezzo più alto, quindi confronta sempre la stessa memoria.` },
    ],
  },
  {
    path: '/guides/resale-value-branded-clothes',
    kind: 'article',
    crumb: 'Quanto valgono i miei vestiti',
    parent: GUIDES_PARENT,
    title: 'Quanto valgono i miei vestiti? Rivendere abbigliamento di marca',
    description: `Cosa determina il valore di rivendita dei vestiti di marca usati: marchio, tipo di capo, condizioni, taglia e stagione, dove venderli e come stimare il prezzo da una foto.`,
    h1: `Quanto valgono i miei vestiti? Valore di rivendita dell'abbigliamento di marca`,
    lead: `Due giacche che sembrano simili possono valere 5 € o 150 €. Nell'abbigliamento usato il marchio conta più di tutto, seguito da tipo di capo, condizioni e taglia. Ecco come capire quanto puoi chiedere.`,
    sections: [
      {
        h2: 'Cosa determina il prezzo',
        html: `<ul><li><strong>Marchio:</strong> è il fattore più importante. I capi dei marchi fast fashion come Zara, H&amp;M, Bershka e Pull&amp;Bear di solito si rivendono da pochi euro fino a circa 15-20 €. I marchi premium e outdoor valgono molto di più.</li><li><strong>Tipo di capo:</strong> una giacca o un cappotto valgono più di una maglietta dello stesso marchio.</li><li><strong>Linee e modelli famosi:</strong> i Levi's 501 o una The North Face Nuptse hanno un prezzo diverso da un capo base dello stesso marchio.</li><li><strong>Condizioni:</strong> nuovo con cartellino, nuovo senza cartellino, ottime, buone o discrete condizioni. Macchie, pilling e scoloriture abbassano il prezzo.</li><li><strong>Taglia:</strong> le taglie più comuni si vendono più in fretta.</li><li><strong>Stagione:</strong> cappotti e giacche si vendono meglio in autunno, costumi e capi leggeri in primavera.</li><li><strong>Completezza:</strong> cintura, cappuccio staccabile o dust bag per le borse.</li></ul>`,
      },
      {
        h2: 'Originale o falso',
        html: `<p>Più un marchio è ricercato, più è copiato. Gli acquirenti controllano le etichette, i cartellini di autenticità e le cuciture. Se hai lo scontrino o la prova d'acquisto, conservala e citala nell'annuncio: aiuta a vendere più in fretta e a un prezzo migliore. Non vendere mai un capo come originale se non ne sei sicuro.</p>`,
      },
      {
        h2: 'Dove vendere',
        html: `<ul><li><strong>Vinted:</strong> il posto principale per l'abbigliamento usato in Europa. In gran parte d'Europa chi vende non paga commissioni; l'acquirente paga spedizione e Protezione acquisti. Leggi <a href="${h('/guides/how-to-sell-on-vinted')}">come vendere su Vinted</a>.</li><li><strong>eBay:</strong> dal 2026 i venditori privati nel SEE non pagano commissioni di vendita, ma di solito la spedizione la paga chi vende. Utile per marchi premium e acquirenti in altri paesi.</li><li><strong>Di persona:</strong> mercatini e scambi locali, senza spedizione, ma con meno acquirenti.</li></ul>`,
      },
      {
        h2: 'Come ti aiuta FlipLens',
        html: `<p>Fotografa il capo e l'etichetta del marchio. FlipLens legge marchio e tipo di capo (donna, uomo o bambini) e confronta gli annunci dello stesso marchio e tipo nella stessa categoria eBay, su eBay in cinque paesi UE o su eBay.co.uk, correggendo al ribasso i prezzi richiesti. Per i vestiti la stima predefinita è per Vinted, togliendo la spedizione tipica perché lì la paga l'acquirente, con eBay mostrato accanto per confronto. I capi senza marchio non ricevono un prezzo. Poi, dalla stessa foto, FlipLens scrive l'annuncio per Vinted con il <a href="${h('/vinted-listing-generator')}">generatore di annunci Vinted</a>.</p><p>Per l'abbigliamento la stima è più approssimativa che per l'elettronica, perché taglia, vestibilità e condizioni variano molto. Usala come punto di partenza e confrontala con articoli simili su Vinted. Vedi anche <a href="${h('/guides/how-to-check-resale-value')}">come controllare il valore di rivendita</a>.</p>`,
      },
    ],
    faq: [
      { q: 'Quanto valgono i vestiti di Zara o H&M usati?', a: `Di solito da pochi euro fino a circa 15-20 € per capo, secondo tipo di capo e condizioni. I capi nuovi con cartellino e le giacche stanno nella parte alta della fascia.` },
      { q: 'Dove conviene vendere vestiti usati?', a: `Su Vinted per la maggior parte dei capi, perché chi vende non paga commissioni nella maggior parte d'Europa. eBay è utile per marchi premium e acquirenti all'estero.` },
      { q: 'FlipLens dà un prezzo anche ai vestiti senza marchio?', a: `No. Senza marchio non ci sono annunci paragonabili affidabili, quindi FlipLens non stima un prezzo. Puoi comunque scrivere l'annuncio per Vinted dalla foto.` },
    ],
  },
  {
    path: '/guides/sneaker-resale-value',
    kind: 'article',
    crumb: 'Valore delle sneakers',
    parent: GUIDES_PARENT,
    title: 'Valore di rivendita delle sneakers: quanto valgono le mie scarpe?',
    description: `Cosa determina il valore di rivendita delle sneakers usate: marchio, modello, taglia, condizioni, scatola e autenticità, dove venderle e come stimare il prezzo da una foto.`,
    h1: 'Valore di rivendita delle sneakers: quanto valgono le mie scarpe?',
    lead: `Le sneakers sono tra i capi che si rivendono meglio, ma il prezzo dipende molto dal modello esatto e dalla taglia. Ecco cosa guardano gli acquirenti prima di fare un'offerta.`,
    sections: [
      {
        h2: 'Cosa determina il prezzo',
        html: `<ul><li><strong>Marchio e modello:</strong> modelli noti come Nike Air Force 1 o Adidas Samba hanno un prezzo diverso da una scarpa base dello stesso marchio. Indica sempre il nome esatto del modello e il colore.</li><li><strong>Taglia:</strong> le taglie più richieste si vendono più in fretta, di solito EU 40-44 da uomo e 37-39 da donna. Le taglie molto piccole o molto grandi hanno meno acquirenti.</li><li><strong>Condizioni:</strong> nuove con cartellino, nuove senza cartellino, ottime, buone o discrete. Suola consumata, pieghe sulla tomaia e ingiallimenti abbassano il prezzo.</li><li><strong>Completezza:</strong> la scatola originale, i lacci di ricambio e gli accessori aiutano, soprattutto per le sneakers più ricercate.</li><li><strong>Stagione:</strong> le scarpe leggere si vendono meglio in primavera ed estate, quelle invernali in autunno.</li></ul>`,
      },
      {
        h2: 'Autenticità',
        html: `<p>Le sneakers più popolari sono tra gli articoli più contraffatti. Fotografa l'etichetta interna con taglia e codice del modello, la suola e la scatola. Lo scontrino o la conferma d'ordine aumentano la fiducia degli acquirenti. Se compri per rivendere, diffida dei prezzi troppo bassi per modelli molto richiesti.</p>`,
      },
      {
        h2: 'Prepararle alla vendita',
        html: `<ul><li>Pulisci tomaia e suola e lava o sostituisci i lacci.</li><li>Fotografa entrambe le scarpe da lato, davanti, dietro, la suola e l'etichetta interna.</li><li>Mostra da vicino i difetti: gli acquirenti si fidano di chi li indica.</li><li>Scrivi taglia EU e, se la conosci, la taglia UK o US.</li></ul>`,
      },
      {
        h2: 'Dove vendere',
        html: `<p>Su Vinted chi vende non paga commissioni nella maggior parte d'Europa e l'acquirente paga spedizione e Protezione acquisti; leggi <a href="${h('/guides/how-to-sell-on-vinted')}">come vendere su Vinted</a>. Su eBay i venditori privati nel SEE non pagano commissioni di vendita dal 2026, ma di solito pagano la spedizione. Di persona eviti la spedizione, ma raggiungi meno acquirenti.</p>`,
      },
      {
        h2: 'Come ti aiuta FlipLens',
        html: `<p>Fotografa le scarpe e l'etichetta interna. FlipLens legge marchio e tipo (donna, uomo o bambini) e confronta gli annunci dello stesso marchio e tipo nella stessa categoria eBay, su eBay in cinque paesi UE o su eBay.co.uk, correggendo al ribasso i prezzi richiesti. La stima predefinita è per Vinted, togliendo la spedizione tipica perché lì la paga l'acquirente, con eBay mostrato accanto. Le scarpe senza marchio non ricevono un prezzo. Dalla stessa foto FlipLens scrive anche l'annuncio con il <a href="${h('/vinted-listing-generator')}">generatore di annunci Vinted</a>.</p><p>Per scarpe e abbigliamento la stima è più approssimativa che per l'elettronica: confrontala con sneakers dello stesso modello e taglia su Vinted. Vedi anche <a href="${h('/guides/how-to-check-resale-value')}">come controllare il valore di rivendita</a>.</p>`,
      },
    ],
    faq: [
      { q: 'Quali taglie di sneakers si vendono più in fretta?', a: `Di solito EU 40-44 da uomo e 37-39 da donna, perché sono le taglie con più acquirenti.` },
      { q: 'La scatola originale conta?', a: `Sì, soprattutto per i modelli più ricercati. Sneakers con la scatola originale sembrano più curate e più facili da verificare, quindi si vendono meglio.` },
      { q: 'Come dimostro che le mie sneakers sono originali?', a: `Fotografa l'etichetta interna con il codice del modello, la suola e la scatola, e conserva lo scontrino o la conferma d'ordine.` },
    ],
  },
  {
    path: '/guides/lego-set-value',
    kind: 'article',
    crumb: 'Valore dei set LEGO',
    parent: GUIDES_PARENT,
    title: 'Quanto vale il mio set LEGO? Valore di rivendita dei set',
    description: `Come capire quanto vale un set LEGO usato: numero del set, sigillato o aperto, completezza di minifigure e istruzioni, set fuori produzione e dove venderlo.`,
    h1: 'Quanto vale il mio set LEGO?',
    lead: `Lo stesso set LEGO può valere molto o poco secondo le condizioni: sigillato, completo con istruzioni e minifigure, oppure sfuso e incompleto. Ecco come capire quanto puoi chiedere.`,
    sections: [
      {
        h2: 'Trova il numero del set',
        html: `<p>Ogni set LEGO ha un numero di 4-6 cifre stampato sulla scatola e sul libretto di istruzioni. È il modo più sicuro per identificare il set esatto: il nome da solo non basta, perché molti set hanno nomi simili o più versioni. Se non hai più la scatola, cerca il numero sulle istruzioni o confronta il modello con i cataloghi online.</p>`,
      },
      {
        h2: 'Cosa determina il prezzo',
        html: `<ul><li><strong>Nuovo sigillato:</strong> la scatola mai aperta è di solito la condizione che vale di più.</li><li><strong>Nuovo aperto:</strong> scatola aperta ma pezzi completi e mai montati.</li><li><strong>Usato completo:</strong> tutti i pezzi, con istruzioni e minifigure.</li><li><strong>Usato senza scatola:</strong> completo ma senza la scatola originale, vale meno.</li><li><strong>Incompleto:</strong> mancano pezzi, il valore scende molto.</li><li><strong>Minifigure e istruzioni:</strong> se mancano, il prezzo cala parecchio, perché sono tra le parti più cercate.</li><li><strong>Fuori produzione o in commercio:</strong> i set fuori produzione spesso aumentano di valore; quelli ancora in vendita competono con gli sconti dei negozi.</li></ul>`,
      },
      {
        h2: 'Completezza, copie e mattoncini sfusi',
        html: `<p>Prima di vendere, controlla che il set sia completo confrontandolo con l'inventario dei pezzi del set, che trovi online cercando il numero. Indica nell'annuncio cosa manca: gli acquirenti apprezzano la sincerità.</p><p>Le copie e i mattoncini compatibili (Lepin o articoli venduti come &quot;compatibile&quot;) non sono LEGO e non vanno venduti come tali. I mattoncini sfusi, senza un set preciso, si vendono di solito a peso: è un mercato separato, con prezzi diversi da quelli dei set completi.</p>`,
      },
      {
        h2: 'Dove vendere',
        html: `<ul><li><strong>eBay:</strong> molti acquirenti in tutta Europa, utile per set completi e fuori produzione.</li><li><strong>Subito e vendita locale:</strong> senza spedizione, comodo per set grandi e lotti di mattoncini.</li><li><strong>Vinted:</strong> funziona bene per i set per bambini.</li><li><strong>BrickLink:</strong> il mercato specializzato per singoli pezzi e minifigure.</li></ul><p>Per altri consigli su cosa comprare per rivendere, vedi la <a href="${h('/guides/flea-market-reselling-checklist')}">checklist per il mercatino</a>.</p>`,
      },
      {
        h2: 'Come ti aiuta FlipLens',
        html: `<p>Scansiona il codice a barre o fotografa la scatola. FlipLens legge il numero del set e confronta gli annunci di quel set esatto, escludendo gli annunci di sole istruzioni, i set incompleti, le copie e i lotti. Cerca su eBay in cinque paesi UE o su eBay.co.uk, corregge al ribasso i prezzi richiesti e ti mostra il massimo da pagare. Vedi anche <a href="${h('/guides/how-to-check-resale-value')}">come controllare il valore di rivendita</a>.</p>`,
      },
    ],
    faq: [
      { q: 'Dove trovo il numero del mio set LEGO?', a: `Sulla scatola e sul libretto di istruzioni. È un numero di 4-6 cifre che identifica il set esatto.` },
      { q: 'Un set LEGO senza minifigure vale ancora qualcosa?', a: `Sì, ma molto meno. Minifigure e istruzioni sono tra le parti più cercate, quindi se mancano il prezzo cala parecchio.` },
      { q: 'I mattoncini compatibili valgono come i LEGO?', a: `No. Le copie e i mattoncini compatibili, come Lepin, non sono LEGO e non vanno venduti come tali.` },
    ],
  },
  {
    path: '/guides/resale-value-books-vinyl-dvds',
    kind: 'article',
    crumb: 'Libri, vinili, CD e DVD',
    parent: GUIDES_PARENT,
    title: 'Valore di rivendita di libri, vinili, CD e DVD',
    description: `Quanto valgono libri, vinili, CD e DVD usati: codice a barre, edizione e formato, cosa vale davvero, servizi di riacquisto o vendita diretta e lotti.`,
    h1: 'Valore di rivendita di libri, vinili, CD e DVD',
    lead: `La maggior parte di libri, CD e DVD usati si rivende a pochi euro, ma alcune edizioni valgono molto di più. Ecco come riconoscerle e dove venderle.`,
    sections: [
      {
        h2: `Il codice a barre identifica l'edizione`,
        html: `<p>Il codice a barre è il modo più rapido per trovare l'edizione esatta: l'ISBN per i libri, l'EAN per musica e film. Due copie dello stesso titolo possono avere codici diversi e prezzi molto diversi, quindi confronta sempre la stessa edizione.</p>`,
      },
      {
        h2: 'Edizione e formato contano',
        html: `<ul><li><strong>Libri:</strong> una prima edizione può valere molto più di una ristampa; la copertina rigida di solito vale più della copertina flessibile.</li><li><strong>Vinili:</strong> la stampa originale vale in genere più di una ristampa; anche 180g e picture disc hanno un mercato proprio.</li><li><strong>Film:</strong> DVD, Blu-ray e 4K hanno prezzi diversi; steelbook e cofanetti completi sono i più cercati.</li><li><strong>Condizioni:</strong> copertine, custodie e dischi senza graffi fanno la differenza.</li></ul>`,
      },
      {
        h2: 'Cosa vale davvero',
        html: `<p>La maggior parte dei libri, CD e DVD di largo consumo si rivende a pochi euro. Il valore sta nelle edizioni rare, nei vinili più richiesti e nei cofanetti completi. Per gli articoli economici conviene vendere a lotti: un lotto di libri o di DVD dello stesso genere si vende più facilmente dei pezzi singoli.</p>`,
      },
      {
        h2: 'Riacquisto o vendita diretta',
        html: `<p>I servizi di riacquisto pagano subito, ma pagano poco. Vendendo da solo su eBay, Vinted o Subito di solito guadagni di più, ma ci vuole più tempo. Per gli articoli di poco valore il riacquisto o un lotto possono bastare; per le edizioni rare e i vinili ricercati conviene l'annuncio. Per altri consigli vedi la <a href="${h('/guides/flea-market-reselling-checklist')}">checklist per il mercatino</a>.</p>`,
      },
      {
        h2: 'Come ti aiuta FlipLens',
        html: `<p>Scansiona il codice a barre o scatta una foto. FlipLens cerca l'edizione esatta tramite il codice a barre su eBay in cinque paesi UE o su eBay.co.uk, corregge al ribasso i prezzi richiesti e ti mostra il massimo da pagare.</p><p>Con la modalità &quot;Tanti articoli insieme&quot; scatti una foto per articolo, per esempio per uno scatolone di libri o una pila di dischi, e FlipLens ti dà i prezzi di tutti e scrive gli annunci. Vedi anche <a href="${h('/guides/how-to-check-resale-value')}">come controllare il valore di rivendita</a>.</p>`,
      },
    ],
    faq: [
      { q: 'Quanto vale un libro usato?', a: `La maggior parte dei libri di largo consumo si rivende a pochi euro. Le prime edizioni e le edizioni rare possono valere molto di più: controlla l'ISBN per trovare l'edizione esatta.` },
      { q: 'I vinili ristampati valgono come gli originali?', a: `Di solito no. La stampa originale vale in genere più di una ristampa, anche se alcune ristampe come i 180g o i picture disc hanno un loro mercato.` },
      { q: 'Conviene vendere a un servizio di riacquisto?', a: `Ti paga subito, ma poco. Vendendo da solo su eBay, Vinted o Subito di solito guadagni di più, soprattutto per edizioni rare e vinili ricercati.` },
    ],
  },
  {
    path: '/about',
    kind: 'page',
    crumb: 'Chi siamo',
    title: 'Chi siamo: FlipLens, uno strumento indipendente per il valore di rivendita in Europa',
    description: `Chi gestisce FlipLens, da dove vengono i prezzi e i principi che lo guidano: nessuna foto salvata, nessun dato eBay salvato, onestà sull'incertezza, indipendenza da eBay e Vinted.`,
    h1: 'Chi siamo',
    lead: `FlipLens aiuta chi compra usato per rivendere a decidere in pochi secondi se un articolo conviene, usando dati reali dei marketplace di tutta Europa.`,
    sections: [
      {
        h2: `Cos'è`,
        html: `<p>Una web app per chi rivende e per i cacciatori di affari. Scatta una foto, scansiona un codice a barre o scrivi un modello, e FlipLens ti mostra la fascia di rivendita, il tuo profitto dopo commissioni e spedizione, il massimo che dovresti pagare e un verdetto chiaro. Scrive anche annunci per Vinted, eBay e Kleinanzeigen da una foto e tiene traccia di ciò che hai comprato e venduto.</p>`,
      },
      {
        h2: 'Chi lo gestisce',
        html: `<p>FlipLens è gestito da ${esc(LEGAL.operator)} in Slovenia. Contatto: <a href="mailto:${LEGAL.supportEmail}">${LEGAL.supportEmail}</a>. Creator e partner: vedi il <a href="${h('/partner')}">programma partner</a>.</p>`,
      },
      {
        h2: 'Da dove vengono i dati',
        html: `<p>I prezzi vengono dagli annunci eBay attivi, letti tramite l'API ufficiale di eBay: in Germania, Francia, Italia, Spagna e Paesi Bassi, convertiti in euro con i tassi di cambio della Banca centrale europea, oppure su eBay.co.uk in sterline per chi vende nel Regno Unito. Il riconoscimento degli articoli usa un modello di visione IA. Dettagli e limiti sono spiegati in <a href="${h('/how-it-works')}">come funziona</a>.</p>`,
      },
      {
        h2: 'Principi',
        html: `<ul><li><strong>Le foto non vengono mai salvate.</strong> Servono solo a riconoscere l'articolo o a scrivere l'annuncio.</li><li><strong>Nessun dato eBay viene salvato.</strong> Gli annunci vengono letti in tempo reale e tenuti in cache solo per poco, come richiede la licenza dell'API di eBay.</li><li><strong>Onesto sull'incertezza.</strong> Ogni stima mostra la sua affidabilità; con troppo pochi dati FlipLens lo dice invece di tirare a indovinare.</li><li><strong>Indipendente.</strong> FlipLens non è affiliato a eBay, Vinted o Kleinanzeigen e non compra, vende o spedisce articoli.</li></ul>`,
      },
      {
        h2: 'Lingue',
        html: `<p>FlipLens è disponibile in inglese, tedesco, italiano e francese. L'app segue la lingua del tuo browser; le pagine in inglese sono su <a href="/" hreflang="en" lang="en">fliplens.eu</a>. Vedi anche l'<a href="/privacy">Informativa sulla privacy</a> e i <a href="/terms">Termini</a>.</p>`,
      },
    ],
  },
];

const GUIDES_IT = PAGES_IT.filter((p) => p.path.startsWith('/guides/'));

PAGES_IT.push({
  path: '/guides',
  kind: 'page',
  crumb: 'Guide',
  title: 'Guide per rivendere in Europa: prezzi, commissioni e acquisti',
  description: `Guide pratiche per chi rivende in Europa: come controllare il valore di rivendita, commissioni eBay.de, dove vendere elettronica usata, come vendere su Vinted e una checklist per il mercatino.`,
  h1: 'Guide per rivendere',
  lead: `Guide brevi e pratiche per comprare e rivendere articoli usati in Europa.`,
  sections: [
    {
      h2: 'Tutte le guide',
      html: `<ul class="guide-list">${GUIDES_IT.map((g) => `<li><a href="${h(g.path)}">${esc(g.h1)}</a><br><span>${esc(g.description)}</span></li>`).join('')}</ul>`,
    },
  ],
});

PAGES_IT.push({
  path: '/partner',
  kind: 'page',
  crumb: 'Programma partner',
  cta: `<p class="cta"><a class="btn" href="/it">Ottieni il tuo link</a><span>Accedi con Google, apri il Profilo, "Invita amici". Partecipare è gratis.</span></p>`,
  title: `Programma partner FlipLens: guadagna il ${REFERRAL.sharePct}% per ${REFERRAL.months} mesi`,
  description: `Consiglia FlipLens a chi rivende e guadagna il ${REFERRAL.sharePct}% di ogni pagamento delle persone che inviti, per ${REFERRAL.months} mesi. Il tuo pubblico riceve ${INVITE_BONUS_CHECKS} controlli gratuiti in più. Pagamenti da ${eur(REFERRAL.minPayoutMinor)}.`,
  h1: `Guadagna il ${REFERRAL.sharePct}% per ${REFERRAL.months} mesi`,
  lead: `Fai video sui ritrovamenti ai mercatini, sui flip o sulla vendita su Vinted? Mostra FlipLens al tuo pubblico e guadagna da ogni persona che si abbona tramite il tuo link.`,
  sections: [
    {
      h2: 'Per chi è',
      html: `<p>Rivenditori e creator su TikTok, Instagram e YouTube che pubblicano contenuti su mercatini, affari dell'usato, flip di elettronica o vendita su Vinted, eBay e Kleinanzeigen. Possono partecipare anche gli utenti normali: chiunque abbia un account FlipLens ha un link di invito.</p>`,
    },
    {
      h2: 'Quanto guadagni',
      html: `<ul><li><strong>Il ${REFERRAL.sharePct}% di ogni pagamento</strong> delle persone che si iscrivono con il tuo link, tasse escluse.</li><li>Per <strong>${REFERRAL.months} mesi</strong> dal primo pagamento di ciascuna persona, rinnovi compresi.</li><li>I guadagni diventano disponibili ${REFERRAL.holdDays} giorni dopo ogni pagamento (il periodo di rimborso).</li><li>Pagamenti da ${eur(REFERRAL.minPayoutMinor)} tramite PayPal o bonifico bancario, da richiedere nell'app.</li></ul><p>Esempio: ${EXAMPLE_PEOPLE} persone con Pro (${eur(PLANS.pro.priceMonthlyMinor)} al mese) ti portano circa <strong>${eur(exampleMinor)} al mese</strong> per ${REFERRAL.months} mesi.</p>`,
    },
    {
      h2: 'Cosa riceve il tuo pubblico',
      html: `<p>Chi crea un nuovo account con il tuo link riceve <strong>${INVITE_BONUS_CHECKS} controlli gratuiti in più</strong> nel primo mese, oltre al piano gratuito. Può controllare a quanto si rivende un articolo, vedere il profitto al netto delle commissioni e scrivere annunci per Vinted, eBay o Kleinanzeigen da una foto.</p>`,
    },
    {
      h2: 'Come partecipare',
      html: `<ol><li>Accedi su <a href="/it">fliplens.eu</a> con Google.</li><li>Apri il Profilo, poi "Invita amici".</li><li>Copia il tuo link (fliplens.eu/it?ref=tuocodice) e condividilo nella bio, nei video e nelle storie.</li></ol><p>Vuoi un codice personalizzato come <code>?ref=anna</code>? Scrivi a <a href="mailto:${LEGAL.supportEmail}">${LEGAL.supportEmail}</a> dopo aver effettuato l'accesso.</p>`,
    },
    {
      h2: 'Idee per i contenuti',
      html: `<ul><li>Controllo al mercatino: "Conviene comprarlo?" con il verdetto a schermo.</li><li>Flip prima e dopo con il profitto reale.</li><li>"Ho trasformato questo in un annuncio Vinted in 10 secondi."</li><li>Le schede "condividi il tuo affare" dell'app nelle tue storie.</li><li>Acquisti dal computer: scorri Vinted o eBay con l'estensione del browser FlipLens e verifica gli affari in diretta.</li></ul>`,
    },
    {
      h2: 'Regole',
      html: `<ul><li>Segnala i contenuti sponsorizzati come pubblicità (in Germania "Werbung" o "Anzeige").</li><li>Niente promesse ingannevoli su guadagni o risultati, niente spam.</li><li>Niente annunci a pagamento sui motori di ricerca per il nome FlipLens, niente auto-inviti o account aggiuntivi.</li></ul><p>Regole complete: <a href="/terms">Termini</a>, sezione "Referral programme".</p>`,
    },
    {
      h2: 'Materiale del brand',
      html: `<p><a href="/og.png">Immagine di anteprima (1200×630)</a> · <a href="/icons/icon-512.png">Icona dell'app (512×512)</a></p>`,
    },
  ],
  faq: [
    { q: 'Partecipare costa qualcosa?', a: `No. Ogni utente che ha effettuato l'accesso ha un link di invito, e il piano gratuito basta per partecipare.` },
    { q: 'Per quanto tempo guadagno da una persona che invito?', a: `${REFERRAL.months} mesi dal suo primo pagamento. Ricevi il ${REFERRAL.sharePct}% di ogni pagamento in quel periodo, rinnovi compresi.` },
    { q: 'Quando e come vengo pagato?', a: `I guadagni diventano disponibili ${REFERRAL.holdDays} giorni dopo ogni pagamento. Da ${eur(REFERRAL.minPayoutMinor)} puoi richiedere un pagamento tramite PayPal o bonifico bancario nell'app; di solito viene pagato entro 14 giorni.` },
    { q: 'Chi paga le tasse sui miei guadagni?', a: `Tu. I guadagni vengono pagati senza trattenute fiscali; dichiarali come previsto nel tuo paese.` },
  ],
});

const UI_IT: UiStrings = {
  nav: [['/how-it-works', 'Come funziona'], ['/pricing', 'Prezzi'], ['/guides', 'Guide'], ['/faq', 'FAQ']],
  tryFree: 'Prova gratis',
  privacy: 'Privacy',
  terms: 'Termini',
  partner: 'Programma partner',
  about: 'Chi siamo',
  compare: 'Metodi a confronto',
  disclaimer: `FlipLens non è affiliato a eBay. I dati eBay sono mostrati tramite l'API di eBay.`,
  questions: 'Domande',
  answers: 'Risposte',
  updated: (d: string) => `Aggiornato il ${d.split('-').reverse().join('/')} · da FlipLens`,
  locale: 'it_IT',
  cta: CTA_IT,
};

/** Italian start-page text for crawlers on /it; the API swaps it into the shell (apps/api/src/web.ts). */
function homePrerenderIt(): string {
  return `<div class="prerender" lang="it">
      <header><strong>FlipLens</strong> · <a href="/it/how-it-works">Come funziona</a> · <a href="/it/pricing">Prezzi</a> · <a href="/it/guides">Guide</a> · <a href="/it/faq">FAQ</a> · <a href="/" hreflang="en" lang="en">English</a> · <a href="/de" hreflang="de" lang="de">Deutsch</a> · <a href="/fr" hreflang="fr" lang="fr">Français</a></header>
      <h1>Scopri quanto vale prima di comprarlo.</h1>
      <p>Per chi rivende in Europa. Scatta una foto, scansiona il codice a barre o scrivi il modello: FlipLens ti mostra a quanto si rivende l'articolo su eBay in Germania, Francia, Italia, Spagna e Paesi Bassi o su eBay.co.uk, il tuo profitto al netto di commissioni e spedizione, il prezzo massimo da pagare e un verdetto chiaro: Ottimo affare, Compra, Al limite o Lascia stare.</p>
      <h2>Tre tocchi, pochi secondi</h2>
      <ol><li>Scansiona: foto dell'articolo o della sua etichetta, codice a barre sulla confezione, oppure scrivi semplicemente il modello.</li><li>Inserisci il prezzo (facoltativo): senza prezzo ottieni il prezzo massimo che conviene pagare.</li><li>Ricevi il verdetto, con i numeri e i motivi che ci stanno dietro.</li></ol>
      <h2>Fatto per decidere cosa comprare, non per tirare a indovinare</h2>
      <ul><li>Elettronica, console, fotocamere, sneakers, abbigliamento di marca e borse. I capi sono valutati per marca, tipo e condizione, per donna, uomo o bambini.</li><li>Il modello esatto, non "cuffie": varianti sbagliate, accessori, bundle e articoli guasti vengono scartati.</li><li>Dati di mercato aggiornati da eBay in cinque paesi UE (in euro) o da eBay.co.uk (in sterline). Puoi vedere ogni annuncio usato.</li><li>Profitto al netto delle commissioni del marketplace e della spedizione, più il prezzo massimo che conviene pagare.</li><li>Onesto sull'incertezza: ogni verdetto mostra la sua affidabilità; dati insufficienti significa nessun numero.</li><li>Vendi? Trasforma la foto di qualsiasi articolo, anche abbigliamento, in un annuncio per Vinted, eBay o Kleinanzeigen: <a href="/it/vinted-listing-generator">generatore di annunci</a>.</li></ul>
      <h2>Prezzi</h2>
      <ul>${plans.map((p) => `<li>${esc(p.name)}: ${p.priceMonthlyMinor ? `${eur(p.priceMonthlyMinor)} al mese` : 'gratis'}. ${(IT_FEATURES[p.id] ?? []).map(esc).join(', ')}.</li>`).join('')}</ul>
      <h2>Domande</h2>
      ${COMMON_FAQ_IT.map((f) => `<h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>`).join('')}
      <h2>Guide</h2>
      <ul>${GUIDES_IT.map((g) => `<li><a href="${h(g.path)}">${esc(g.h1)}</a></li>`).join('')}</ul>
      <p><a href="/it/partner">Programma partner: guadagna il ${REFERRAL.sharePct}% per ${REFERRAL.months} mesi</a> · <a href="/privacy">Informativa sulla privacy</a> · <a href="/terms">Termini di servizio</a> · FlipLens non è affiliato a eBay.</p>
    </div>`;
}

export const IT: LangPack = {
  pages: PAGES_IT,
  commonFaq: COMMON_FAQ_IT,
  ui: UI_IT,
  home: {
    title: `FlipLens: conviene comprarlo per rivenderlo? Valore di rivendita in Europa`,
    description: `Foto, codice a barre o modello: a quanto si rivendono elettronica, sneakers e abbigliamento di marca su eBay in UE e Regno Unito, il tuo profitto e il prezzo massimo.`,
    prerender: homePrerenderIt(),
  },
};
