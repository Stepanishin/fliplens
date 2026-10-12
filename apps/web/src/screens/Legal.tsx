import type { ReactNode } from 'react';
import { PLANS, REFERRAL } from '@fliplens/core';
import { LEGAL, LEGAL_IS_DRAFT } from '../legal.js';
import { LANG, money, tr } from '../i18n.js';

const T = tr({
  en: {
    privacy: 'Privacy',
    terms: 'Terms',
    openApp: 'Open app',
    draft: 'Draft: the operator details below are placeholders. Fill them in (apps/web/src/legal.ts) and have this document reviewed by a lawyer before launch.',
    effective: 'Effective',
    privacyPolicy: 'Privacy Policy',
    termsOfService: 'Terms of Service',
    support: 'Support',
    privacyContact: 'Privacy',
    note: '',
  },
  de: {
    privacy: 'Datenschutz',
    terms: 'Nutzungsbedingungen',
    openApp: 'App öffnen',
    draft: 'Entwurf: Die Angaben zum Betreiber unten sind Platzhalter. Bitte ergänzen (apps/web/src/legal.ts) und das Dokument vor dem Start anwaltlich prüfen lassen.',
    effective: 'Gültig ab',
    privacyPolicy: 'Datenschutzerklärung',
    termsOfService: 'Nutzungsbedingungen',
    support: 'Support',
    privacyContact: 'Datenschutz',
    note: 'Diese Übersetzung dient dem besseren Verständnis. Bei Abweichungen gilt die englische Fassung.',
  },
  it: {
    privacy: 'Privacy',
    terms: 'Termini',
    openApp: "Apri l'app",
    draft: "Bozza: i dati del gestore riportati sotto sono segnaposto. Completali (apps/web/src/legal.ts) e fai verificare questo documento da un avvocato prima del lancio.",
    effective: 'In vigore dal',
    privacyPolicy: 'Informativa sulla privacy',
    termsOfService: 'Termini di servizio',
    support: 'Assistenza',
    privacyContact: 'Privacy',
    note: 'Questa traduzione è fornita per comodità. In caso di differenze prevale la versione inglese.',
  },
  fr: {
    privacy: 'Confidentialité',
    terms: 'Conditions',
    openApp: "Ouvrir l'app",
    draft: "Brouillon : les informations sur l'exploitant ci-dessous sont provisoires. Complétez-les (apps/web/src/legal.ts) et faites relire ce document par un avocat avant le lancement.",
    effective: 'En vigueur au',
    privacyPolicy: 'Politique de confidentialité',
    termsOfService: "Conditions d'utilisation",
    support: 'Assistance',
    privacyContact: 'Confidentialité',
    note: "Cette traduction est fournie à titre indicatif. En cas de divergence, la version anglaise prévaut.",
  },
});

/** Country names used in the governing-law clause. */
const COUNTRY_DE: Record<string, string> = { Slovenia: 'Slowenien', Germany: 'Deutschland', Austria: 'Österreich' };
/** Italian and French include the preposition and article ("della Slovenia", "de la Slovénie"). */
const COUNTRY_IT: Record<string, string> = { Slovenia: 'della Slovenia', Germany: 'della Germania', Austria: "dell'Austria" };
const COUNTRY_FR: Record<string, string> = { Slovenia: 'de la Slovénie', Germany: "de l'Allemagne", Austria: "de l'Autriche" };
const gc = LEGAL.governingCountry;
const country = {
  en: gc,
  de: COUNTRY_DE[gc] ?? gc,
  it: COUNTRY_IT[gc] ?? `di ${gc}`,
  fr: COUNTRY_FR[gc] ?? `de ${gc}`,
}[LANG];

/**
 * Privacy Policy and Terms of Service. The texts describe what the code actually does
 * (see docs/DECISIONS.md ADR-009..012); update them whenever data handling changes.
 */

function LegalLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="legal">
      <header className="lp-nav">
        <a className="logo" href="/"><img src="/icons/icon.svg" alt="" width={28} height={28} /> FlipLens</a>
        <nav>
          <a href="/privacy">{T.privacy}</a>
          <a href="/terms">{T.terms}</a>
          <a className="ghost small-btn" href="/">{T.openApp}</a>
        </nav>
      </header>
      <article className="legal-body">
        {LEGAL_IS_DRAFT && (
          <div className="banner warn">
            {T.draft}
          </div>
        )}
        <h1>{title}</h1>
        {T.note && <p className="muted small">{T.note}</p>}
        <p className="muted">{T.effective} {LEGAL.effectiveDate}</p>
        {children}
      </article>
      <footer className="lp-footer">
        <span>© {new Date().getFullYear()} {LEGAL.operator}</span>
        <span><a href="/privacy">{T.privacyPolicy}</a> · <a href="/terms">{T.termsOfService}</a></span>
      </footer>
    </div>
  );
}

const Operator = () => (
  <p>
    {LEGAL.operator}
    <br />
    {LEGAL.address && <>{LEGAL.address}<br /></>}
    {LEGAL.registration && <>{LEGAL.registration}<br /></>}
    {T.support}: <a href={`mailto:${LEGAL.supportEmail}`}>{LEGAL.supportEmail}</a>
    <br />
    {T.privacyContact}: <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>
  </p>
);

export function PrivacyPolicy() {
  const Page = { en: PrivacyPolicyEn, de: PrivacyPolicyDe, it: PrivacyPolicyIt, fr: PrivacyPolicyFr }[LANG];
  return <Page />;
}

function PrivacyPolicyEn() {
  return (
    <LegalLayout title="Privacy Policy">
      <p>
        This policy explains what personal data FlipLens collects, why, who it is shared with and what your rights are under the EU
        General Data Protection Regulation (GDPR). We collect as little as we can to give you a resale verdict.
      </p>

      <h2>1. Who is responsible</h2>
      <p>The controller of your personal data is:</p>
      <Operator />

      <h2>2. What we collect and why</h2>
      <table className="legal-table">
        <thead>
          <tr><th>Data</th><th>Purpose</th><th>Legal basis</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>A random device identifier created by the app and kept in your browser storage</td>
            <td>Keep this device signed in to your account</td>
            <td>Contract (Art. 6(1)(b) GDPR)</td>
          </tr>
          <tr>
            <td>Your Google account details: name, email address, profile picture link and Google account ID</td>
            <td>Create your account and keep your data on all your devices</td>
            <td>Contract (Art. 6(1)(b))</td>
          </tr>
          <tr>
            <td>Your checks and recognition attempts: product brand, model and variant, condition, the purchase price you enter, the valuation result (also when there was not enough data), how the product was identified (photo, barcode, typed), barcodes that could not be found, and any corrections you made</td>
            <td>Show your results and history; count usage against your plan's monthly limits; improve recognition accuracy from corrections</td>
            <td>Contract (Art. 6(1)(b)); legitimate interest in improving the service (Art. 6(1)(f))</td>
          </tr>
          <tr>
            <td>Photos you take or upload</td>
            <td>Identify the product. Photos are reduced in size on your device, sent for recognition and <strong>not stored</strong> by us</td>
            <td>Contract (Art. 6(1)(b))</td>
          </tr>
          <tr>
            <td>Barcode numbers you scan</td>
            <td>Find the product in marketplace listings</td>
            <td>Contract (Art. 6(1)(b))</td>
          </tr>
          <tr>
            <td>Your settings: country, preferred marketplace, typical shipping cost, target ROI</td>
            <td>Calculate profit the way you sell</td>
            <td>Contract (Art. 6(1)(b))</td>
          </tr>
          <tr>
            <td>Usage events inside the app (for example "check started", "valuation completed", "comparables opened", which screens are opened) with a few non-identifying details such as product category or decision. For visits we also note the referring website, utm_source, whether the device is a phone and the browser language, counted under a one-way hash of the random device ID (no cookie, no third-party analytics)</td>
            <td>Understand which features work and fix problems. First-party only: no third-party trackers or advertising</td>
            <td>Legitimate interest (Art. 6(1)(f))</td>
          </tr>
          <tr>
            <td>Technical records: approximate cost of each recognition request, server logs including your IP address</td>
            <td>Operate, secure and keep the service affordable; prevent abuse</td>
            <td>Legitimate interest (Art. 6(1)(f))</td>
          </tr>
          <tr>
            <td>If you subscribe: your Stripe customer ID, plan, subscription status and billing period. Card details are entered on Stripe's page and never reach us</td>
            <td>Provide the paid plan; keep required accounting records</td>
            <td>Contract (Art. 6(1)(b)); legal obligation (Art. 6(1)(c))</td>
          </tr>
          <tr>
            <td>Referral programme: who invited you (if anyone); for people who invite others, their earnings and the payout details they enter (PayPal email, or account holder and IBAN)</td>
            <td>Credit and pay referral earnings, prevent abuse</td>
            <td>Contract (Art. 6(1)(b) GDPR)</td>
          </tr>
        </tbody>
      </table>
      <p>
        We do not sell your data, do not use it for advertising and do not build profiles about you beyond what is needed to show your own history.
        Verdicts are information to help you decide; they are not automated decisions with legal effect on you.
      </p>

      <h2>3. Who we share data with</h2>
      <p>We use these service providers. They process data on our behalf or, where noted, as independent providers for the part you use directly:</p>
      <ul>
        <li><strong>Neon</strong> (database hosting, servers in Frankfurt, Germany): stores the data listed above.</li>
        <li><strong>OpenAI</strong> (product recognition): receives your photos, or for barcodes the marketplace titles found for that code, and returns the product identity. We ask OpenAI not to store requests for later retrieval; OpenAI may keep API data for a limited time for abuse monitoring under its API data policy.</li>
        <li><strong>eBay</strong> (marketplace data): receives the product name or barcode number we search for. No personal data about you is sent.</li>
        <li><strong>Google</strong> (sign-in): when you use "Continue with Google", Google processes your login under its own privacy policy and may set its own cookies for the sign-in window.</li>
        <li><strong>Stripe</strong> (payments): processes your payment and billing details under its own privacy policy.</li>
        <li><strong>European Central Bank</strong> (exchange rates): we download public reference rates; no personal data is sent.</li>
        <li><strong>DigitalOcean</strong> (hosting of the app and API, App Platform, data centre in Frankfurt, Germany). Web traffic passes through its content delivery network, Cloudflare.</li>
      </ul>
      <p>
        Links to other marketplaces (for example Vinted, Kleinanzeigen) only open their websites in your browser; we send them nothing.
      </p>

      <h2>4. Transfers outside the EU</h2>
      <p>
        OpenAI, Google and Stripe may process data in the United States. Where they do, transfers are based on the EU-US Data Privacy Framework
        or on the European Commission's Standard Contractual Clauses.
      </p>

      <h2>5. How long we keep data</h2>
      <ul>
        <li>Photos: not stored by us.</li>
        <li>Checks, corrections, settings and usage events: until you delete them or your account.</li>
        <li>Server logs: up to 30 days.</li>
        <li>Payment and invoice records: as long as tax and accounting law requires.</li>
        <li>Referral earnings and payout records: as long as tax and accounting law requires.</li>
      </ul>

      <h2>6. Your rights</h2>
      <p>
        You have the right to access, correct, delete, restrict and export your data, and to object to processing based on legitimate interest.
        In the app, Profile lets you <strong>export all your data</strong> and <strong>delete all your data</strong> at any time; you can also delete single checks.
        For anything else write to <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>. You can also complain to your data protection supervisory authority.
      </p>

      <h2>7. Storage on your device</h2>
      <p>
        The app keeps your device identifier, settings and a few interface preferences in your browser's local storage. They are needed for the app to work
        and are not used for tracking. We do not use advertising or analytics cookies.
      </p>

      <h2>8. Children</h2>
      <p>FlipLens is not intended for children under 16.</p>

      <h2>9. Changes</h2>
      <p>If we change how we handle data, we update this page and its effective date, and tell you in the app for significant changes.</p>
    </LegalLayout>
  );
}

const eur = (minor: number): string => money(minor, 2, 'EUR');

export function TermsOfService() {
  const Page = { en: TermsOfServiceEn, de: TermsOfServiceDe, it: TermsOfServiceIt, fr: TermsOfServiceFr }[LANG];
  return <Page />;
}

function TermsOfServiceEn() {
  return (
    <LegalLayout title="Terms of Service">
      <p>These terms apply to your use of FlipLens, the app and website that estimates the resale value of second-hand items. FlipLens is provided by:</p>
      <Operator />

      <h2>1. What FlipLens does, and what it does not</h2>
      <p>
        FlipLens identifies a product from a photo, barcode or model name, looks up comparable marketplace listings and calculates an estimated resale value,
        profit after fees and a buy recommendation. <strong>These are estimates for information only.</strong> They are based on third-party data, mainly current
        eBay asking prices, which can differ from what an item actually sells for. Product recognition can be wrong. You decide what to buy and at what price,
        and you are responsible for checking the item. FlipLens is not a marketplace: we do not buy, sell, ship or pay for goods.
      </p>

      <h2>2. Who can use it</h2>
      <p>You must be at least 18 years old, or the age of majority where you live. You can use FlipLens as a consumer or for your business.</p>

      <h2>3. Account</h2>
      <p>
        You need to sign in with Google to use FlipLens. Your checks, history and plan are tied to that account and available on all your devices.
        Keep your devices secure; anyone with access to your signed-in app can see your checks. You can sign out, export your data and delete your account at any time in Profile.
      </p>

      <h2>4. Plans and payment</h2>
      <ul>
        {Object.values(PLANS).map((p) => (
          <li key={p.id}>
            <strong>{p.name}</strong>: {p.priceMonthlyMinor === 0 ? 'free' : `${eur(p.priceMonthlyMinor)} per month`}, {p.monthlyValuations.toLocaleString('en-IE')} checks per calendar month
            {p.id === 'reseller' ? ' (presented as unlimited, subject to this fair-use limit)' : ''}.
          </li>
        ))}
      </ul>
      <p>
        Every valuation counts as a check, also when there is not enough market data. Photo and barcode recognition is limited to one and a half times your plan's
        monthly checks. Prices shown are final prices; no fees or taxes are added at checkout. Paid plans are billed monthly in advance through Stripe and renew automatically until cancelled. You can cancel at any time in
        "Manage subscription"; the plan then stays active until the end of the paid period and is not renewed. Unused checks do not carry over. We may change
        prices for future billing periods with at least 30 days' notice; you can cancel before the change takes effect.
      </p>

      <h2>5. Right of withdrawal (EU consumers)</h2>
      <p>
        If you are a consumer in the EU, you can withdraw from a paid subscription within 14 days of subscribing without giving a reason, by writing to{' '}
        <a href={`mailto:${LEGAL.supportEmail}`}>{LEGAL.supportEmail}</a>. If you asked us to start the service during this period, you pay only for the part of the period
        already provided; the rest is refunded.
      </p>

      <h2>6. Fair use</h2>
      <p>
        Do not misuse FlipLens: no automated or bulk requests, no attempts to copy or resell its data, no reverse engineering, no interference with its
        security, and no use for illegal goods. We may limit or suspend accounts that break these rules, after warning you where reasonable.
      </p>

      <h2>7. Referral programme</h2>
      <p>
        Signed-in users can invite others with a personal link. For people who create a new FlipLens account through your link, you receive{' '}
        {REFERRAL.sharePct}% of each payment they make for FlipLens (without taxes) during the {REFERRAL.months} months after their first payment.
        Earnings become available {REFERRAL.holdDays} days after each payment and are cancelled if the payment is refunded or charged back. You can
        request a payout once at least {money(REFERRAL.minPayoutMinor, 0, 'EUR')} is available, by PayPal or bank transfer; we usually pay within 14 days.
        Inviting yourself, creating several accounts, misleading advertising, spam and bidding on the FlipLens name in search ads are not allowed;
        earnings from such activity are cancelled. You are responsible for any taxes on your earnings and, where required, for labelling your posts
        as advertising. People who sign up through an invite link get {REFERRAL.inviteeBonusChecks} extra free checks during their first {REFERRAL.inviteeBonusDays} days. We may change or end the programme for the future; earnings already available will still be paid.
      </p>

      <h2>8. Third-party services</h2>
      <p>
        FlipLens uses data and services from third parties such as eBay, OpenAI, Google and Stripe. FlipLens is not affiliated with, endorsed by or
        sponsored by eBay or any marketplace we link to. Links to other marketplaces open their websites, which have their own terms.
      </p>

      <h2>9. Availability and changes</h2>
      <p>
        We work to keep FlipLens available and accurate but cannot guarantee uninterrupted service or that every estimate is correct. We may improve or change
        features. If a change removes a core part of a paid plan, you may cancel and receive a refund for the unused part of the period.
      </p>

      <h2>10. Liability</h2>
      <p>
        We are liable without limitation for intent and gross negligence, for injury to life, body or health, and where mandatory law, including consumer law,
        provides so. Otherwise we are liable for slight negligence only if we breach an essential obligation, and then only for typical, foreseeable damage.
        We are not liable for purchase or sale decisions you make based on an estimate, or for losses from inaccurate third-party data, except as stated above.
      </p>

      <h2>11. Ending the agreement</h2>
      <p>
        You can stop using FlipLens and delete your data at any time. We may end the service for you with 30 days' notice, or immediately for serious breach of
        these terms. Paid periods already paid for are refunded pro rata if we end the service without cause.
      </p>

      <h2>12. Law and disputes</h2>
      <p>
        These terms are governed by the law of {country}. If you are a consumer, you also keep the protection of the mandatory laws of the country
        where you live, and you can bring claims in your local courts. Please contact us first at <a href={`mailto:${LEGAL.supportEmail}`}>{LEGAL.supportEmail}</a>; we try to
        solve every issue directly.
      </p>

      <h2>13. Changes to these terms</h2>
      <p>
        We may update these terms. We will tell you in the app at least 30 days before significant changes take effect. If you do not agree, you can cancel
        before then.
      </p>
    </LegalLayout>
  );
}

// ---------- German translation (the English version prevails, see the note under the title) ----------

function PrivacyPolicyDe() {
  return (
    <LegalLayout title="Datenschutzerklärung">
      <p>
        Diese Erklärung beschreibt, welche personenbezogenen Daten FlipLens erhebt, zu welchem Zweck, an wen sie weitergegeben werden und welche Rechte Sie nach
        der Datenschutz-Grundverordnung der EU (DSGVO) haben. Wir erheben so wenig Daten wie möglich, um Ihnen eine Einschätzung zum Wiederverkauf zu geben.
      </p>

      <h2>1. Verantwortlicher</h2>
      <p>Verantwortlich für die Verarbeitung Ihrer personenbezogenen Daten ist:</p>
      <Operator />

      <h2>2. Welche Daten wir erheben und warum</h2>
      <table className="legal-table">
        <thead>
          <tr><th>Daten</th><th>Zweck</th><th>Rechtsgrundlage</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>Eine zufällige Gerätekennung, die von der App erzeugt und im Speicher Ihres Browsers abgelegt wird</td>
            <td>Dieses Gerät mit Ihrem Konto angemeldet halten</td>
            <td>Vertrag (Art. 6 Abs. 1 lit. b DSGVO)</td>
          </tr>
          <tr>
            <td>Ihre Google-Kontodaten: Name, E-Mail-Adresse, Link zum Profilbild und Google-Konto-ID</td>
            <td>Ihr Konto anlegen und Ihre Daten auf allen Ihren Geräten bereitstellen</td>
            <td>Vertrag (Art. 6 Abs. 1 lit. b)</td>
          </tr>
          <tr>
            <td>Ihre Checks und Erkennungsversuche: Marke, Modell und Variante des Produkts, Zustand, der von Ihnen eingegebene Einkaufspreis, das Bewertungsergebnis (auch wenn nicht genügend Daten vorlagen), die Art der Erkennung (Foto, Barcode, eingetippt), nicht gefundene Barcodes sowie Ihre Korrekturen</td>
            <td>Ergebnisse und Verlauf anzeigen; die Nutzung auf die monatlichen Limits Ihres Tarifs anrechnen; die Erkennung anhand von Korrekturen verbessern</td>
            <td>Vertrag (Art. 6 Abs. 1 lit. b); berechtigtes Interesse an der Verbesserung des Dienstes (Art. 6 Abs. 1 lit. f)</td>
          </tr>
          <tr>
            <td>Fotos, die Sie aufnehmen oder hochladen</td>
            <td>Das Produkt erkennen. Fotos werden auf Ihrem Gerät verkleinert, zur Erkennung übermittelt und von uns <strong>nicht gespeichert</strong></td>
            <td>Vertrag (Art. 6 Abs. 1 lit. b)</td>
          </tr>
          <tr>
            <td>Barcode-Nummern, die Sie scannen</td>
            <td>Das Produkt in Marktplatz-Angeboten finden</td>
            <td>Vertrag (Art. 6 Abs. 1 lit. b)</td>
          </tr>
          <tr>
            <td>Ihre Einstellungen: Land, bevorzugter Marktplatz, übliche Versandkosten, Ziel-ROI</td>
            <td>Den Gewinn so berechnen, wie Sie verkaufen</td>
            <td>Vertrag (Art. 6 Abs. 1 lit. b)</td>
          </tr>
          <tr>
            <td>Nutzungsereignisse in der App (zum Beispiel "Check gestartet", "Bewertung abgeschlossen", "Vergleichsangebote geöffnet", welche Bildschirme geöffnet werden) mit wenigen nicht identifizierenden Angaben wie Produktkategorie oder Ergebnis. Bei Besuchen erfassen wir außerdem die verweisende Website, utm_source, ob das Gerät ein Smartphone ist, und die Browsersprache, gezählt unter einem Einweg-Hash der zufälligen Gerätekennung (kein Cookie, keine Analysedienste Dritter)</td>
            <td>Verstehen, welche Funktionen funktionieren, und Fehler beheben. Nur eigene Auswertung: keine Tracker oder Werbung Dritter</td>
            <td>Berechtigtes Interesse (Art. 6 Abs. 1 lit. f)</td>
          </tr>
          <tr>
            <td>Technische Aufzeichnungen: ungefähre Kosten jeder Erkennungsanfrage, Serverprotokolle einschließlich Ihrer IP-Adresse</td>
            <td>Den Dienst betreiben, absichern und bezahlbar halten; Missbrauch verhindern</td>
            <td>Berechtigtes Interesse (Art. 6 Abs. 1 lit. f)</td>
          </tr>
          <tr>
            <td>Wenn Sie ein Abo abschließen: Ihre Stripe-Kunden-ID, Tarif, Abo-Status und Abrechnungszeitraum. Kartendaten geben Sie auf der Seite von Stripe ein; sie erreichen uns nie</td>
            <td>Den kostenpflichtigen Tarif bereitstellen; gesetzlich vorgeschriebene Buchhaltungsunterlagen führen</td>
            <td>Vertrag (Art. 6 Abs. 1 lit. b); rechtliche Verpflichtung (Art. 6 Abs. 1 lit. c)</td>
          </tr>
          <tr>
            <td>Empfehlungsprogramm: wer Sie eingeladen hat (falls zutreffend); bei Personen, die andere einladen, deren Einnahmen und die angegebenen Auszahlungsdaten (PayPal-E-Mail oder Kontoinhaber und IBAN)</td>
            <td>Einnahmen gutschreiben und auszahlen, Missbrauch verhindern</td>
            <td>Vertrag (Art. 6 Abs. 1 lit. b DSGVO)</td>
          </tr>
        </tbody>
      </table>
      <p>
        Wir verkaufen Ihre Daten nicht, nutzen sie nicht für Werbung und erstellen keine Profile über Sie, die über die Anzeige Ihres eigenen Verlaufs hinausgehen.
        Die Einschätzungen sind Informationen, die Ihnen bei der Entscheidung helfen; sie sind keine automatisierten Entscheidungen mit rechtlicher Wirkung für Sie.
      </p>

      <h2>3. An wen wir Daten weitergeben</h2>
      <p>Wir nutzen die folgenden Dienstleister. Sie verarbeiten Daten in unserem Auftrag oder, wo angegeben, als eigenständige Anbieter für den Teil, den Sie direkt nutzen:</p>
      <ul>
        <li><strong>Neon</strong> (Datenbank-Hosting, Server in Frankfurt, Deutschland): speichert die oben genannten Daten.</li>
        <li><strong>OpenAI</strong> (Produkterkennung): erhält Ihre Fotos oder, bei Barcodes, die zu dieser Nummer gefundenen Angebotstitel und liefert die Produktidentität zurück. Wir weisen OpenAI an, Anfragen nicht zum späteren Abruf zu speichern; OpenAI kann API-Daten nach seinen API-Datenrichtlinien für begrenzte Zeit zur Missbrauchsüberwachung aufbewahren.</li>
        <li><strong>eBay</strong> (Marktdaten): erhält den Produktnamen oder die Barcode-Nummer, nach der wir suchen. Personenbezogene Daten über Sie werden nicht übermittelt.</li>
        <li><strong>Google</strong> (Anmeldung): Wenn Sie "Mit Google fortfahren" nutzen, verarbeitet Google Ihre Anmeldung nach seiner eigenen Datenschutzerklärung und kann für das Anmeldefenster eigene Cookies setzen.</li>
        <li><strong>Stripe</strong> (Zahlungen): verarbeitet Ihre Zahlungs- und Abrechnungsdaten nach seiner eigenen Datenschutzerklärung.</li>
        <li><strong>Europäische Zentralbank</strong> (Wechselkurse): Wir laden öffentliche Referenzkurse herunter; personenbezogene Daten werden nicht übermittelt.</li>
        <li><strong>DigitalOcean</strong> (Hosting der App und API, App Platform, Rechenzentrum in Frankfurt, Deutschland). Der Webverkehr läuft über dessen Content-Delivery-Netzwerk Cloudflare.</li>
      </ul>
      <p>
        Links zu anderen Marktplätzen (zum Beispiel Vinted, Kleinanzeigen) öffnen nur deren Websites in Ihrem Browser; wir übermitteln ihnen nichts.
      </p>

      <h2>4. Übermittlungen außerhalb der EU</h2>
      <p>
        OpenAI, Google und Stripe können Daten in den Vereinigten Staaten verarbeiten. In diesem Fall erfolgt die Übermittlung auf Grundlage des EU-US Data Privacy
        Framework oder der Standardvertragsklauseln der Europäischen Kommission.
      </p>

      <h2>5. Wie lange wir Daten speichern</h2>
      <ul>
        <li>Fotos: werden von uns nicht gespeichert.</li>
        <li>Checks, Korrekturen, Einstellungen und Nutzungsereignisse: bis Sie sie oder Ihr Konto löschen.</li>
        <li>Serverprotokolle: bis zu 30 Tage.</li>
        <li>Zahlungs- und Rechnungsunterlagen: so lange, wie es das Steuer- und Handelsrecht verlangt.</li>
        <li>Empfehlungseinnahmen und Auszahlungsunterlagen: so lange, wie es das Steuer- und Handelsrecht verlangt.</li>
      </ul>

      <h2>6. Ihre Rechte</h2>
      <p>
        Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung und Datenübertragbarkeit sowie das Recht, einer Verarbeitung auf
        Grundlage berechtigter Interessen zu widersprechen. In der App können Sie unter Profil jederzeit <strong>alle Ihre Daten exportieren</strong> und{' '}
        <strong>alle Ihre Daten löschen</strong>; einzelne Checks können Sie ebenfalls löschen. Für alles Weitere schreiben Sie an{' '}
        <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>. Sie können sich außerdem bei Ihrer Datenschutz-Aufsichtsbehörde beschweren.
      </p>

      <h2>7. Speicherung auf Ihrem Gerät</h2>
      <p>
        Die App speichert Ihre Gerätekennung, Ihre Einstellungen und einige Oberflächeneinstellungen im lokalen Speicher Ihres Browsers. Sie sind für das Funktionieren
        der App erforderlich und werden nicht zum Tracking verwendet. Wir verwenden keine Werbe- oder Analyse-Cookies.
      </p>

      <h2>8. Kinder</h2>
      <p>FlipLens ist nicht für Kinder unter 16 Jahren bestimmt.</p>

      <h2>9. Änderungen</h2>
      <p>Wenn wir den Umgang mit Daten ändern, aktualisieren wir diese Seite und ihr Gültigkeitsdatum und informieren Sie bei wesentlichen Änderungen in der App.</p>
    </LegalLayout>
  );
}

function TermsOfServiceDe() {
  return (
    <LegalLayout title="Nutzungsbedingungen">
      <p>Diese Bedingungen gelten für Ihre Nutzung von FlipLens, der App und Website, die den Wiederverkaufswert gebrauchter Artikel schätzt. FlipLens wird angeboten von:</p>
      <Operator />

      <h2>1. Was FlipLens leistet und was nicht</h2>
      <p>
        FlipLens erkennt ein Produkt anhand eines Fotos, eines Barcodes oder eines Modellnamens, sucht vergleichbare Marktplatz-Angebote und berechnet einen geschätzten
        Wiederverkaufswert, den Gewinn nach Gebühren und eine Kaufempfehlung. <strong>Dies sind Schätzungen, die nur der Information dienen.</strong> Sie beruhen auf Daten
        Dritter, vor allem auf aktuellen eBay-Angebotspreisen, die von dem tatsächlich erzielten Verkaufspreis abweichen können. Die Produkterkennung kann fehlerhaft sein.
        Sie entscheiden, was Sie zu welchem Preis kaufen, und sind dafür verantwortlich, den Artikel zu prüfen. FlipLens ist kein Marktplatz: Wir kaufen, verkaufen,
        versenden oder bezahlen keine Waren.
      </p>

      <h2>2. Wer FlipLens nutzen darf</h2>
      <p>Sie müssen mindestens 18 Jahre alt oder an Ihrem Wohnort volljährig sein. Sie können FlipLens als Verbraucher oder für Ihr Unternehmen nutzen.</p>

      <h2>3. Konto</h2>
      <p>
        Für die Nutzung von FlipLens müssen Sie sich mit Google anmelden. Ihre Checks, Ihr Verlauf und Ihr Tarif sind mit diesem Konto verknüpft und auf allen Ihren
        Geräten verfügbar. Schützen Sie Ihre Geräte; jeder mit Zugriff auf Ihre angemeldete App kann Ihre Checks sehen. Sie können sich jederzeit unter Profil abmelden,
        Ihre Daten exportieren und Ihr Konto löschen.
      </p>

      <h2>4. Tarife und Zahlung</h2>
      <ul>
        {Object.values(PLANS).map((p) => (
          <li key={p.id}>
            <strong>{p.name}</strong>: {p.priceMonthlyMinor === 0 ? 'kostenlos' : `${eur(p.priceMonthlyMinor)} pro Monat`}, {p.monthlyValuations.toLocaleString('de-DE')} Checks pro Kalendermonat
            {p.id === 'reseller' ? ' (als unbegrenzt dargestellt, vorbehaltlich dieses Fair-Use-Limits)' : ''}.
          </li>
        ))}
      </ul>
      <p>
        Jede Bewertung zählt als Check, auch wenn nicht genügend Marktdaten vorliegen. Die Foto- und Barcode-Erkennung ist auf das Eineinhalbfache der monatlichen Checks
        Ihres Tarifs begrenzt. Die angezeigten Preise sind Endpreise; beim Bezahlen kommen keine Gebühren oder Steuern hinzu. Kostenpflichtige Tarife werden monatlich im
        Voraus über Stripe abgerechnet und verlängern sich automatisch bis zur Kündigung. Sie können jederzeit unter "Abo verwalten" kündigen; der Tarif bleibt dann bis
        zum Ende des bezahlten Zeitraums aktiv und wird nicht verlängert. Nicht genutzte Checks verfallen. Wir können die Preise für künftige Abrechnungszeiträume mit
        einer Frist von mindestens 30 Tagen ändern; Sie können vor Inkrafttreten der Änderung kündigen.
      </p>

      <h2>5. Widerrufsrecht (Verbraucher in der EU)</h2>
      <p>
        Wenn Sie Verbraucher in der EU sind, können Sie ein kostenpflichtiges Abo innerhalb von 14 Tagen nach Abschluss ohne Angabe von Gründen widerrufen, indem Sie an{' '}
        <a href={`mailto:${LEGAL.supportEmail}`}>{LEGAL.supportEmail}</a> schreiben. Wenn Sie verlangt haben, dass wir mit der Leistung während dieser Frist beginnen,
        zahlen Sie nur für den bereits erbrachten Teil des Zeitraums; der Rest wird erstattet.
      </p>

      <h2>6. Faire Nutzung</h2>
      <p>
        Missbrauchen Sie FlipLens nicht: keine automatisierten oder massenhaften Anfragen, keine Versuche, Daten zu kopieren oder weiterzuverkaufen, kein Reverse
        Engineering, keine Eingriffe in die Sicherheit und keine Nutzung für illegale Waren. Wir können Konten, die gegen diese Regeln verstoßen, einschränken oder
        sperren, soweit zumutbar nach vorheriger Warnung.
      </p>

      <h2>7. Empfehlungsprogramm</h2>
      <p>
        Angemeldete Nutzer können andere über einen persönlichen Link einladen. Für Personen, die über Ihren Link ein neues FlipLens-Konto
        anlegen, erhalten Sie {REFERRAL.sharePct} % jeder Zahlung, die diese Person für FlipLens leistet (ohne Steuern), in den {REFERRAL.months} Monaten
        nach ihrer ersten Zahlung. Einnahmen werden {REFERRAL.holdDays} Tage nach jeder Zahlung auszahlbar und verfallen, wenn die Zahlung erstattet oder
        zurückgebucht wird. Eine Auszahlung können Sie anfordern, sobald mindestens {money(REFERRAL.minPayoutMinor, 0, 'EUR')} auszahlbar sind, per PayPal oder
        Überweisung; wir zahlen in der Regel innerhalb von 14 Tagen. Nicht erlaubt sind Selbsteinladungen, mehrere Konten, irreführende Werbung,
        Spam und Suchanzeigen auf den Namen FlipLens; Einnahmen aus solchen Aktivitäten verfallen. Für Steuern auf Ihre Einnahmen und, soweit
        erforderlich, für die Kennzeichnung Ihrer Beiträge als Werbung sind Sie selbst verantwortlich. Wer sich über einen Einladungslink anmeldet, erhält in den ersten {REFERRAL.inviteeBonusDays} Tagen {REFERRAL.inviteeBonusChecks} zusätzliche kostenlose Checks. Wir können das Programm für die Zukunft
        ändern oder beenden; bereits auszahlbare Einnahmen werden weiterhin ausgezahlt.
      </p>

      <h2>8. Dienste Dritter</h2>
      <p>
        FlipLens nutzt Daten und Dienste Dritter wie eBay, OpenAI, Google und Stripe. FlipLens ist weder mit eBay noch mit einem der verlinkten Marktplätze verbunden,
        wird von ihnen nicht unterstützt und nicht gesponsert. Links zu anderen Marktplätzen öffnen deren Websites, für die eigene Bedingungen gelten.
      </p>

      <h2>9. Verfügbarkeit und Änderungen</h2>
      <p>
        Wir bemühen uns, FlipLens verfügbar und genau zu halten, können aber keinen unterbrechungsfreien Betrieb und nicht die Richtigkeit jeder Schätzung garantieren.
        Wir können Funktionen verbessern oder ändern. Entfällt durch eine Änderung ein wesentlicher Bestandteil eines kostenpflichtigen Tarifs, können Sie kündigen und
        erhalten eine Erstattung für den nicht genutzten Teil des Zeitraums.
      </p>

      <h2>10. Haftung</h2>
      <p>
        Wir haften unbeschränkt bei Vorsatz und grober Fahrlässigkeit, bei Verletzung von Leben, Körper oder Gesundheit sowie soweit zwingendes Recht, einschließlich des
        Verbraucherrechts, dies vorsieht. Im Übrigen haften wir für leichte Fahrlässigkeit nur bei Verletzung einer wesentlichen Vertragspflicht und dann nur für den
        typischen, vorhersehbaren Schaden. Wir haften nicht für Kauf- oder Verkaufsentscheidungen, die Sie auf Grundlage einer Schätzung treffen, oder für Verluste aus
        ungenauen Daten Dritter, außer wie oben angegeben.
      </p>

      <h2>11. Beendigung</h2>
      <p>
        Sie können die Nutzung von FlipLens jederzeit beenden und Ihre Daten löschen. Wir können den Dienst für Sie mit einer Frist von 30 Tagen beenden oder bei einem
        schweren Verstoß gegen diese Bedingungen fristlos. Bereits bezahlte Zeiträume werden anteilig erstattet, wenn wir den Dienst ohne wichtigen Grund beenden.
      </p>

      <h2>12. Anwendbares Recht und Streitigkeiten</h2>
      <p>
        Für diese Bedingungen gilt das Recht von {country}. Als Verbraucher behalten Sie zusätzlich den Schutz der zwingenden Vorschriften des Landes, in dem Sie wohnen,
        und können Ansprüche vor den Gerichten an Ihrem Wohnort geltend machen. Bitte wenden Sie sich zuerst an{' '}
        <a href={`mailto:${LEGAL.supportEmail}`}>{LEGAL.supportEmail}</a>; wir versuchen, jedes Anliegen direkt zu lösen.
      </p>

      <h2>13. Änderungen dieser Bedingungen</h2>
      <p>
        Wir können diese Bedingungen aktualisieren. Über wesentliche Änderungen informieren wir Sie in der App mindestens 30 Tage vor ihrem Inkrafttreten. Wenn Sie nicht
        einverstanden sind, können Sie vorher kündigen.
      </p>
    </LegalLayout>
  );
}

// ---------- Italian translation (the English version prevails, see the note under the title) ----------

function PrivacyPolicyIt() {
  return (
    <LegalLayout title="Informativa sulla privacy">
      <p>
        Questa informativa spiega quali dati personali raccoglie FlipLens, per quale motivo, con chi vengono condivisi e quali sono i tuoi diritti ai sensi del
        Regolamento generale sulla protezione dei dati (GDPR) dell'UE. Raccogliamo il minimo indispensabile per fornirti una valutazione di rivendita.
      </p>

      <h2>1. Titolare del trattamento</h2>
      <p>Il titolare del trattamento dei tuoi dati personali è:</p>
      <Operator />

      <h2>2. Quali dati raccogliamo e perché</h2>
      <table className="legal-table">
        <thead>
          <tr><th>Dati</th><th>Finalità</th><th>Base giuridica</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>Un identificativo casuale del dispositivo, creato dall'app e conservato nella memoria del browser</td>
            <td>Mantenere questo dispositivo connesso al tuo account</td>
            <td>Contratto (art. 6, par. 1, lett. b, GDPR)</td>
          </tr>
          <tr>
            <td>I dati del tuo account Google: nome, indirizzo email, link all'immagine del profilo e ID dell'account Google</td>
            <td>Creare il tuo account e rendere disponibili i tuoi dati su tutti i tuoi dispositivi</td>
            <td>Contratto (art. 6, par. 1, lett. b)</td>
          </tr>
          <tr>
            <td>Le tue verifiche e i tentativi di riconoscimento: marca, modello e variante del prodotto, condizioni, il prezzo di acquisto che inserisci, il risultato della valutazione (anche quando i dati non erano sufficienti), il modo in cui il prodotto è stato identificato (foto, codice a barre, testo digitato), i codici a barre non trovati e le eventuali correzioni che hai apportato</td>
            <td>Mostrare i risultati e la cronologia; conteggiare l'utilizzo rispetto ai limiti mensili del tuo piano; migliorare la precisione del riconoscimento grazie alle correzioni</td>
            <td>Contratto (art. 6, par. 1, lett. b); legittimo interesse al miglioramento del servizio (art. 6, par. 1, lett. f)</td>
          </tr>
          <tr>
            <td>Le foto che scatti o carichi</td>
            <td>Identificare il prodotto. Le foto vengono ridimensionate sul tuo dispositivo, inviate per il riconoscimento e <strong>non vengono conservate</strong> da noi</td>
            <td>Contratto (art. 6, par. 1, lett. b)</td>
          </tr>
          <tr>
            <td>I numeri dei codici a barre che scansioni</td>
            <td>Trovare il prodotto negli annunci dei marketplace</td>
            <td>Contratto (art. 6, par. 1, lett. b)</td>
          </tr>
          <tr>
            <td>Le tue impostazioni: paese, marketplace preferito, costo di spedizione abituale, ROI obiettivo</td>
            <td>Calcolare il profitto in base al modo in cui vendi</td>
            <td>Contratto (art. 6, par. 1, lett. b)</td>
          </tr>
          <tr>
            <td>Eventi di utilizzo all'interno dell'app (ad esempio "verifica avviata", "valutazione completata", "annunci comparabili aperti", quali schermate vengono aperte) con pochi dettagli non identificativi, come la categoria del prodotto o l'esito. Per le visite registriamo inoltre il sito di provenienza, utm_source, se il dispositivo è uno smartphone e la lingua del browser, conteggiati tramite un hash unidirezionale dell'identificativo casuale del dispositivo (nessun cookie, nessuno strumento di analisi di terze parti)</td>
            <td>Capire quali funzioni sono utili e risolvere i problemi. Solo dati propri: nessun tracker o pubblicità di terze parti</td>
            <td>Legittimo interesse (art. 6, par. 1, lett. f)</td>
          </tr>
          <tr>
            <td>Registrazioni tecniche: costo approssimativo di ogni richiesta di riconoscimento, log del server, compreso il tuo indirizzo IP</td>
            <td>Gestire il servizio, proteggerlo e mantenerlo sostenibile nei costi; prevenire gli abusi</td>
            <td>Legittimo interesse (art. 6, par. 1, lett. f)</td>
          </tr>
          <tr>
            <td>Se sottoscrivi un abbonamento: il tuo ID cliente Stripe, il piano, lo stato dell'abbonamento e il periodo di fatturazione. I dati della carta vengono inseriti sulla pagina di Stripe e non ci raggiungono mai</td>
            <td>Fornire il piano a pagamento; conservare le registrazioni contabili obbligatorie</td>
            <td>Contratto (art. 6, par. 1, lett. b); obbligo legale (art. 6, par. 1, lett. c)</td>
          </tr>
          <tr>
            <td>Programma referral: chi ti ha invitato (se qualcuno lo ha fatto); per chi invita altre persone, i relativi guadagni e i dati di pagamento inseriti (email PayPal, oppure intestatario del conto e IBAN)</td>
            <td>Accreditare e pagare i guadagni da referral, prevenire gli abusi</td>
            <td>Contratto (art. 6, par. 1, lett. b, GDPR)</td>
          </tr>
        </tbody>
      </table>
      <p>
        Non vendiamo i tuoi dati, non li usiamo per pubblicità e non creiamo profili su di te oltre quanto necessario per mostrarti la tua cronologia.
        Le valutazioni sono informazioni che ti aiutano a decidere; non sono decisioni automatizzate che producono effetti giuridici nei tuoi confronti.
      </p>

      <h2>3. Con chi condividiamo i dati</h2>
      <p>Ci avvaliamo dei seguenti fornitori di servizi. Trattano i dati per nostro conto oppure, dove indicato, come fornitori indipendenti per la parte che utilizzi direttamente:</p>
      <ul>
        <li><strong>Neon</strong> (hosting del database, server a Francoforte, Germania): conserva i dati elencati sopra.</li>
        <li><strong>OpenAI</strong> (riconoscimento dei prodotti): riceve le tue foto oppure, per i codici a barre, i titoli degli annunci trovati per quel codice, e restituisce l'identità del prodotto. Chiediamo a OpenAI di non conservare le richieste per un successivo recupero; OpenAI può conservare i dati delle API per un periodo limitato a fini di monitoraggio degli abusi, secondo la propria politica sui dati delle API.</li>
        <li><strong>eBay</strong> (dati di mercato): riceve il nome del prodotto o il numero del codice a barre che cerchiamo. Non viene inviato alcun dato personale che ti riguarda.</li>
        <li><strong>Google</strong> (accesso): quando usi "Continua con Google", Google tratta il tuo accesso secondo la propria informativa sulla privacy e può impostare propri cookie per la finestra di accesso.</li>
        <li><strong>Stripe</strong> (pagamenti): tratta i tuoi dati di pagamento e di fatturazione secondo la propria informativa sulla privacy.</li>
        <li><strong>Banca centrale europea</strong> (tassi di cambio): scarichiamo i tassi di riferimento pubblici; non viene inviato alcun dato personale.</li>
        <li><strong>DigitalOcean</strong> (hosting dell'app e dell'API, App Platform, data center a Francoforte, Germania). Il traffico web passa attraverso la sua rete di distribuzione dei contenuti, Cloudflare.</li>
      </ul>
      <p>
        I link ad altri marketplace (ad esempio Vinted, Kleinanzeigen) si limitano ad aprire i loro siti nel tuo browser; non inviamo loro nulla.
      </p>

      <h2>4. Trasferimenti al di fuori dell'UE</h2>
      <p>
        OpenAI, Google e Stripe possono trattare dati negli Stati Uniti. In tal caso, i trasferimenti si basano sull'EU-US Data Privacy Framework
        o sulle clausole contrattuali tipo della Commissione europea.
      </p>

      <h2>5. Per quanto tempo conserviamo i dati</h2>
      <ul>
        <li>Foto: non conservate da noi.</li>
        <li>Verifiche, correzioni, impostazioni ed eventi di utilizzo: finché non li elimini o non elimini il tuo account.</li>
        <li>Log del server: fino a 30 giorni.</li>
        <li>Registrazioni di pagamenti e fatture: per il tempo richiesto dalla normativa fiscale e contabile.</li>
        <li>Guadagni da referral e registrazioni dei pagamenti: per il tempo richiesto dalla normativa fiscale e contabile.</li>
      </ul>

      <h2>6. I tuoi diritti</h2>
      <p>
        Hai il diritto di accedere ai tuoi dati, rettificarli, cancellarli, limitarne il trattamento ed esportarli, nonché di opporti al trattamento basato sul legittimo interesse.
        Nell'app, la sezione Profilo ti consente in qualsiasi momento di <strong>esportare tutti i tuoi dati</strong> e di <strong>eliminare tutti i tuoi dati</strong>; puoi anche eliminare singole verifiche.
        Per qualsiasi altra richiesta scrivi a <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>. Puoi inoltre proporre reclamo all'autorità di controllo per la protezione dei dati.
      </p>

      <h2>7. Memorizzazione sul tuo dispositivo</h2>
      <p>
        L'app conserva l'identificativo del dispositivo, le impostazioni e alcune preferenze dell'interfaccia nella memoria locale del browser. Sono necessari per il funzionamento
        dell'app e non vengono usati per il tracciamento. Non utilizziamo cookie pubblicitari o di analisi.
      </p>

      <h2>8. Minori</h2>
      <p>FlipLens non è destinato ai minori di 16 anni.</p>

      <h2>9. Modifiche</h2>
      <p>Se cambiamo il modo in cui trattiamo i dati, aggiorniamo questa pagina e la sua data di entrata in vigore e, in caso di modifiche significative, te lo comunichiamo nell'app.</p>
    </LegalLayout>
  );
}

function TermsOfServiceIt() {
  return (
    <LegalLayout title="Termini di servizio">
      <p>Questi termini si applicano al tuo utilizzo di FlipLens, l'app e il sito web che stimano il valore di rivendita degli articoli usati. FlipLens è fornito da:</p>
      <Operator />

      <h2>1. Cosa fa FlipLens e cosa non fa</h2>
      <p>
        FlipLens identifica un prodotto a partire da una foto, da un codice a barre o dal nome del modello, cerca annunci comparabili sui marketplace e calcola un valore di
        rivendita stimato, il profitto al netto delle commissioni e una raccomandazione di acquisto. <strong>Si tratta di stime fornite a solo scopo informativo.</strong> Si basano
        su dati di terze parti, principalmente sui prezzi richiesti attualmente su eBay, che possono differire dal prezzo a cui un articolo viene effettivamente venduto. Il
        riconoscimento del prodotto può essere errato. Sei tu a decidere cosa acquistare e a quale prezzo, e sei responsabile del controllo dell'articolo. FlipLens non è un
        marketplace: non acquistiamo, vendiamo, spediamo né paghiamo merci.
      </p>

      <h2>2. Chi può utilizzarlo</h2>
      <p>Devi avere almeno 18 anni o aver raggiunto la maggiore età nel paese in cui vivi. Puoi usare FlipLens come consumatore o per la tua attività professionale.</p>

      <h2>3. Account</h2>
      <p>
        Per usare FlipLens devi accedere con Google. Le tue verifiche, la cronologia e il piano sono collegati a quell'account e disponibili su tutti i tuoi dispositivi.
        Proteggi i tuoi dispositivi; chiunque abbia accesso all'app in cui hai effettuato l'accesso può vedere le tue verifiche. Puoi disconnetterti, esportare i tuoi dati ed
        eliminare il tuo account in qualsiasi momento dalla sezione Profilo.
      </p>

      <h2>4. Piani e pagamento</h2>
      <ul>
        {Object.values(PLANS).map((p) => (
          <li key={p.id}>
            <strong>{p.name}</strong>: {p.priceMonthlyMinor === 0 ? 'gratuito' : `${eur(p.priceMonthlyMinor)} al mese`}, {p.monthlyValuations.toLocaleString('it-IT')} verifiche per mese solare
            {p.id === 'reseller' ? ' (presentato come illimitato, nel rispetto di questo limite di utilizzo equo)' : ''}.
          </li>
        ))}
      </ul>
      <p>
        Ogni valutazione conta come una verifica, anche quando i dati di mercato non sono sufficienti. Il riconoscimento tramite foto e codice a barre è limitato a una volta e mezza
        le verifiche mensili del tuo piano. I prezzi indicati sono prezzi finali; al momento del pagamento non vengono aggiunte commissioni o imposte. I piani a pagamento sono
        fatturati mensilmente in anticipo tramite Stripe e si rinnovano automaticamente fino alla disdetta. Puoi disdire in qualsiasi momento da "Gestisci abbonamento"; il piano
        resta quindi attivo fino alla fine del periodo pagato e non viene rinnovato. Le verifiche non utilizzate non vengono riportate al mese successivo. Possiamo modificare i
        prezzi per i periodi di fatturazione futuri con un preavviso di almeno 30 giorni; puoi disdire prima che la modifica abbia effetto.
      </p>

      <h2>5. Diritto di recesso (consumatori dell'UE)</h2>
      <p>
        Se sei un consumatore nell'UE, puoi esercitare il diritto di recesso da un abbonamento a pagamento entro 14 giorni dalla sottoscrizione, senza dover fornire alcuna
        motivazione, scrivendo a <a href={`mailto:${LEGAL.supportEmail}`}>{LEGAL.supportEmail}</a>. Se hai chiesto che il servizio iniziasse durante tale periodo, paghi solo
        la parte del periodo già fornita; il resto ti viene rimborsato.
      </p>

      <h2>6. Utilizzo equo</h2>
      <p>
        Non fare un uso improprio di FlipLens: niente richieste automatizzate o massive, nessun tentativo di copiare o rivendere i suoi dati, nessun reverse engineering,
        nessuna interferenza con la sua sicurezza e nessun utilizzo per merci illegali. Possiamo limitare o sospendere gli account che violano queste regole, previo
        avvertimento ove ragionevole.
      </p>

      <h2>7. Programma referral</h2>
      <p>
        Gli utenti che hanno effettuato l'accesso possono invitare altre persone con un link personale. Per le persone che creano un nuovo account FlipLens tramite il tuo link,
        ricevi il {REFERRAL.sharePct}% di ogni pagamento che effettuano per FlipLens (al netto delle imposte) nei {REFERRAL.months} mesi successivi al loro primo pagamento.
        I guadagni diventano disponibili {REFERRAL.holdDays} giorni dopo ciascun pagamento e vengono annullati se il pagamento è rimborsato o stornato. Puoi richiedere un
        pagamento quando sono disponibili almeno {money(REFERRAL.minPayoutMinor, 0, 'EUR')}, tramite PayPal o bonifico bancario; di solito paghiamo entro 14 giorni.
        Non sono consentiti l'autoinvito, la creazione di più account, la pubblicità ingannevole, lo spam e le offerte sul nome FlipLens negli annunci dei motori di ricerca;
        i guadagni derivanti da tali attività vengono annullati. Sei responsabile delle eventuali imposte sui tuoi guadagni e, ove richiesto, dell'indicazione dei tuoi
        contenuti come pubblicità. Chi si registra tramite un link di invito riceve {REFERRAL.inviteeBonusChecks} verifiche gratuite aggiuntive nei primi {REFERRAL.inviteeBonusDays} giorni.
        Possiamo modificare o terminare il programma per il futuro; i guadagni già disponibili verranno comunque pagati.
      </p>

      <h2>8. Servizi di terze parti</h2>
      <p>
        FlipLens utilizza dati e servizi di terze parti come eBay, OpenAI, Google e Stripe. FlipLens non è affiliato, approvato o sponsorizzato da eBay né da alcun
        marketplace a cui rimanda. I link ad altri marketplace aprono i loro siti web, che hanno i propri termini.
      </p>

      <h2>9. Disponibilità e modifiche</h2>
      <p>
        Ci impegniamo a mantenere FlipLens disponibile e accurato, ma non possiamo garantire un servizio ininterrotto né che ogni stima sia corretta. Possiamo migliorare o
        modificare le funzioni. Se una modifica elimina una parte essenziale di un piano a pagamento, puoi disdire e ricevere un rimborso per la parte del periodo non utilizzata.
      </p>

      <h2>10. Responsabilità</h2>
      <p>
        Rispondiamo senza limitazioni in caso di dolo e colpa grave, di lesioni alla vita, all'integrità fisica o alla salute, e ove previsto da norme imperative, comprese
        quelle a tutela dei consumatori. Negli altri casi rispondiamo per colpa lieve solo in caso di violazione di un obbligo essenziale, e in tal caso solo per i danni tipici
        e prevedibili. Non rispondiamo delle decisioni di acquisto o vendita che prendi sulla base di una stima, né delle perdite derivanti da dati inesatti di terze parti,
        salvo quanto indicato sopra.
      </p>

      <h2>11. Cessazione del contratto</h2>
      <p>
        Puoi smettere di usare FlipLens ed eliminare i tuoi dati in qualsiasi momento. Possiamo cessare la fornitura del servizio nei tuoi confronti con un preavviso di 30
        giorni, o immediatamente in caso di grave violazione di questi termini. Se cessiamo il servizio senza giusta causa, i periodi già pagati vengono rimborsati in proporzione.
      </p>

      <h2>12. Legge applicabile e controversie</h2>
      <p>
        Questi termini sono regolati dalla legge {country}. Se sei un consumatore, mantieni inoltre la tutela delle norme imperative del paese in cui vivi e puoi
        agire davanti ai tribunali del tuo luogo di residenza. Ti chiediamo di contattarci prima all'indirizzo{' '}
        <a href={`mailto:${LEGAL.supportEmail}`}>{LEGAL.supportEmail}</a>; cerchiamo di risolvere ogni questione direttamente.
      </p>

      <h2>13. Modifiche a questi termini</h2>
      <p>
        Possiamo aggiornare questi termini. Ti informeremo nell'app almeno 30 giorni prima che le modifiche significative abbiano effetto. Se non sei d'accordo, puoi
        disdire prima di tale data.
      </p>
    </LegalLayout>
  );
}

// ---------- French translation (the English version prevails, see the note under the title) ----------

function PrivacyPolicyFr() {
  return (
    <LegalLayout title="Politique de confidentialité">
      <p>
        Cette politique explique quelles données personnelles FlipLens collecte, pourquoi, avec qui elles sont partagées et quels sont vos droits en vertu du
        Règlement général sur la protection des données de l'UE (RGPD). Nous collectons le moins de données possible pour vous fournir une estimation de revente.
      </p>

      <h2>1. Responsable du traitement</h2>
      <p>Le responsable du traitement de vos données personnelles est :</p>
      <Operator />

      <h2>2. Données collectées et finalités</h2>
      <table className="legal-table">
        <thead>
          <tr><th>Données</th><th>Finalité</th><th>Base juridique</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>Un identifiant d'appareil aléatoire créé par l'application et conservé dans le stockage de votre navigateur</td>
            <td>Maintenir cet appareil connecté à votre compte</td>
            <td>Contrat (art. 6, par. 1, point b, RGPD)</td>
          </tr>
          <tr>
            <td>Les informations de votre compte Google : nom, adresse e-mail, lien vers la photo de profil et identifiant du compte Google</td>
            <td>Créer votre compte et rendre vos données disponibles sur tous vos appareils</td>
            <td>Contrat (art. 6, par. 1, point b)</td>
          </tr>
          <tr>
            <td>Vos vérifications et tentatives de reconnaissance : marque, modèle et variante du produit, état, prix d'achat que vous saisissez, résultat de l'estimation (y compris lorsque les données étaient insuffisantes), mode d'identification du produit (photo, code-barres, saisie), codes-barres introuvables et corrections que vous avez apportées</td>
            <td>Afficher vos résultats et votre historique ; décompter l'utilisation au regard des limites mensuelles de votre formule ; améliorer la précision de la reconnaissance grâce aux corrections</td>
            <td>Contrat (art. 6, par. 1, point b) ; intérêt légitime à améliorer le service (art. 6, par. 1, point f)</td>
          </tr>
          <tr>
            <td>Les photos que vous prenez ou importez</td>
            <td>Identifier le produit. Les photos sont réduites sur votre appareil, envoyées pour la reconnaissance et <strong>ne sont pas conservées</strong> par nous</td>
            <td>Contrat (art. 6, par. 1, point b)</td>
          </tr>
          <tr>
            <td>Les numéros de codes-barres que vous scannez</td>
            <td>Trouver le produit dans les annonces des places de marché</td>
            <td>Contrat (art. 6, par. 1, point b)</td>
          </tr>
          <tr>
            <td>Vos paramètres : pays, place de marché préférée, frais d'envoi habituels, ROI cible</td>
            <td>Calculer le bénéfice selon votre façon de vendre</td>
            <td>Contrat (art. 6, par. 1, point b)</td>
          </tr>
          <tr>
            <td>Événements d'utilisation dans l'application (par exemple « vérification lancée », « estimation terminée », « annonces comparables ouvertes », écrans ouverts) accompagnés de quelques informations non identifiantes, comme la catégorie de produit ou la recommandation. Pour les visites, nous enregistrons également le site de provenance, utm_source, le fait que l'appareil soit un téléphone ou non et la langue du navigateur, comptabilisés sous un hachage à sens unique de l'identifiant aléatoire de l'appareil (aucun cookie, aucun outil d'analyse tiers)</td>
            <td>Comprendre quelles fonctionnalités sont utiles et corriger les problèmes. Données propres uniquement : aucun traceur ni publicité tiers</td>
            <td>Intérêt légitime (art. 6, par. 1, point f)</td>
          </tr>
          <tr>
            <td>Données techniques : coût approximatif de chaque requête de reconnaissance, journaux du serveur, y compris votre adresse IP</td>
            <td>Exploiter et sécuriser le service et en maîtriser les coûts ; prévenir les abus</td>
            <td>Intérêt légitime (art. 6, par. 1, point f)</td>
          </tr>
          <tr>
            <td>Si vous souscrivez un abonnement : votre identifiant client Stripe, votre formule, le statut de l'abonnement et la période de facturation. Les données de carte sont saisies sur la page de Stripe et ne nous parviennent jamais</td>
            <td>Fournir la formule payante ; tenir les registres comptables obligatoires</td>
            <td>Contrat (art. 6, par. 1, point b) ; obligation légale (art. 6, par. 1, point c)</td>
          </tr>
          <tr>
            <td>Programme de parrainage : la personne qui vous a invité (le cas échéant) ; pour les personnes qui en invitent d'autres, leurs gains et les coordonnées de paiement qu'elles saisissent (adresse e-mail PayPal, ou titulaire du compte et IBAN)</td>
            <td>Créditer et verser les gains de parrainage, prévenir les abus</td>
            <td>Contrat (art. 6, par. 1, point b, RGPD)</td>
          </tr>
        </tbody>
      </table>
      <p>
        Nous ne vendons pas vos données, ne les utilisons pas à des fins publicitaires et ne créons pas de profil vous concernant au-delà de ce qui est nécessaire pour afficher
        votre propre historique. Les recommandations sont des informations destinées à vous aider à décider ; elles ne constituent pas des décisions automatisées produisant
        des effets juridiques à votre égard.
      </p>

      <h2>3. Avec qui nous partageons les données</h2>
      <p>Nous faisons appel aux prestataires suivants. Ils traitent les données pour notre compte ou, lorsque cela est indiqué, en tant que prestataires indépendants pour la partie que vous utilisez directement :</p>
      <ul>
        <li><strong>Neon</strong> (hébergement de la base de données, serveurs à Francfort, Allemagne) : conserve les données énumérées ci-dessus.</li>
        <li><strong>OpenAI</strong> (reconnaissance des produits) : reçoit vos photos ou, pour les codes-barres, les titres d'annonces trouvés pour ce code, et renvoie l'identité du produit. Nous demandons à OpenAI de ne pas conserver les requêtes en vue d'une consultation ultérieure ; OpenAI peut conserver les données de l'API pendant une durée limitée à des fins de détection des abus, conformément à sa politique relative aux données de l'API.</li>
        <li><strong>eBay</strong> (données de marché) : reçoit le nom du produit ou le numéro de code-barres que nous recherchons. Aucune donnée personnelle vous concernant n'est transmise.</li>
        <li><strong>Google</strong> (connexion) : lorsque vous utilisez « Continuer avec Google », Google traite votre connexion conformément à sa propre politique de confidentialité et peut déposer ses propres cookies pour la fenêtre de connexion.</li>
        <li><strong>Stripe</strong> (paiements) : traite vos données de paiement et de facturation conformément à sa propre politique de confidentialité.</li>
        <li><strong>Banque centrale européenne</strong> (taux de change) : nous téléchargeons les taux de référence publics ; aucune donnée personnelle n'est transmise.</li>
        <li><strong>DigitalOcean</strong> (hébergement de l'application et de l'API, App Platform, centre de données à Francfort, Allemagne). Le trafic web transite par son réseau de diffusion de contenu, Cloudflare.</li>
      </ul>
      <p>
        Les liens vers d'autres places de marché (par exemple Vinted, Kleinanzeigen) ouvrent uniquement leurs sites dans votre navigateur ; nous ne leur transmettons rien.
      </p>

      <h2>4. Transferts hors de l'UE</h2>
      <p>
        OpenAI, Google et Stripe peuvent traiter des données aux États-Unis. Dans ce cas, les transferts reposent sur le cadre de protection des données UE-États-Unis
        (EU-US Data Privacy Framework) ou sur les clauses contractuelles types de la Commission européenne.
      </p>

      <h2>5. Durée de conservation</h2>
      <ul>
        <li>Photos : non conservées par nous.</li>
        <li>Vérifications, corrections, paramètres et événements d'utilisation : jusqu'à ce que vous les supprimiez ou supprimiez votre compte.</li>
        <li>Journaux du serveur : 30 jours maximum.</li>
        <li>Données de paiement et factures : aussi longtemps que l'exige la législation fiscale et comptable.</li>
        <li>Gains de parrainage et données de versement : aussi longtemps que l'exige la législation fiscale et comptable.</li>
      </ul>

      <h2>6. Vos droits</h2>
      <p>
        Vous disposez d'un droit d'accès, de rectification, d'effacement, de limitation et de portabilité de vos données, ainsi que du droit de vous opposer à un traitement
        fondé sur l'intérêt légitime. Dans l'application, la rubrique Profil vous permet à tout moment d'<strong>exporter toutes vos données</strong> et de{' '}
        <strong>supprimer toutes vos données</strong> ; vous pouvez également supprimer des vérifications individuelles. Pour toute autre demande, écrivez à{' '}
        <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>. Vous pouvez également introduire une réclamation auprès de votre autorité de contrôle en matière de protection des données.
      </p>

      <h2>7. Stockage sur votre appareil</h2>
      <p>
        L'application conserve l'identifiant de votre appareil, vos paramètres et quelques préférences d'interface dans le stockage local de votre navigateur. Ils sont
        nécessaires au fonctionnement de l'application et ne sont pas utilisés à des fins de suivi. Nous n'utilisons pas de cookies publicitaires ni de mesure d'audience.
      </p>

      <h2>8. Enfants</h2>
      <p>FlipLens n'est pas destiné aux enfants de moins de 16 ans.</p>

      <h2>9. Modifications</h2>
      <p>Si nous modifions la manière dont nous traitons les données, nous mettons à jour cette page et sa date d'entrée en vigueur, et nous vous en informons dans l'application en cas de modification importante.</p>
    </LegalLayout>
  );
}

function TermsOfServiceFr() {
  return (
    <LegalLayout title="Conditions d'utilisation">
      <p>Les présentes conditions s'appliquent à votre utilisation de FlipLens, l'application et le site web qui estiment la valeur de revente d'articles d'occasion. FlipLens est fourni par :</p>
      <Operator />

      <h2>1. Ce que fait FlipLens, et ce qu'il ne fait pas</h2>
      <p>
        FlipLens identifie un produit à partir d'une photo, d'un code-barres ou d'un nom de modèle, recherche des annonces comparables sur les places de marché et calcule une
        valeur de revente estimée, le bénéfice après frais et une recommandation d'achat. <strong>Il s'agit d'estimations fournies à titre purement informatif.</strong> Elles
        reposent sur des données de tiers, principalement les prix demandés actuellement sur eBay, qui peuvent différer du prix auquel un article se vend réellement. La
        reconnaissance du produit peut être erronée. Vous décidez de ce que vous achetez et à quel prix, et il vous appartient de vérifier l'article. FlipLens n'est pas une
        place de marché : nous n'achetons, ne vendons, n'expédions ni ne payons aucune marchandise.
      </p>

      <h2>2. Qui peut l'utiliser</h2>
      <p>Vous devez avoir au moins 18 ans, ou l'âge de la majorité dans votre pays de résidence. Vous pouvez utiliser FlipLens en tant que consommateur ou pour votre activité professionnelle.</p>

      <h2>3. Compte</h2>
      <p>
        Pour utiliser FlipLens, vous devez vous connecter avec Google. Vos vérifications, votre historique et votre formule sont liés à ce compte et disponibles sur tous vos
        appareils. Protégez vos appareils ; toute personne ayant accès à votre application connectée peut voir vos vérifications. Vous pouvez à tout moment vous déconnecter,
        exporter vos données et supprimer votre compte dans la rubrique Profil.
      </p>

      <h2>4. Formules et paiement</h2>
      <ul>
        {Object.values(PLANS).map((p) => (
          <li key={p.id}>
            <strong>{p.name}</strong> : {p.priceMonthlyMinor === 0 ? 'gratuit' : `${eur(p.priceMonthlyMinor)} par mois`}, {p.monthlyValuations.toLocaleString('fr-FR')} vérifications par mois civil
            {p.id === 'reseller' ? ' (présenté comme illimité, sous réserve de cette limite d\'utilisation raisonnable)' : ''}.
          </li>
        ))}
      </ul>
      <p>
        Chaque estimation compte comme une vérification, y compris lorsque les données de marché sont insuffisantes. La reconnaissance par photo et par code-barres est limitée à
        une fois et demie le nombre de vérifications mensuelles de votre formule. Les prix affichés sont des prix finaux ; aucun frais ni aucune taxe ne s'ajoute lors du
        paiement. Les formules payantes sont facturées mensuellement et d'avance via Stripe et sont reconduites automatiquement jusqu'à leur résiliation. Vous pouvez résilier à
        tout moment depuis « Gérer l'abonnement » ; la formule reste alors active jusqu'à la fin de la période payée et n'est pas reconduite. Les vérifications non utilisées ne
        sont pas reportées. Nous pouvons modifier les prix pour les périodes de facturation futures moyennant un préavis d'au moins 30 jours ; vous pouvez résilier avant
        l'entrée en vigueur de la modification.
      </p>

      <h2>5. Droit de rétractation (consommateurs de l'UE)</h2>
      <p>
        Si vous êtes un consommateur dans l'UE, vous pouvez exercer votre droit de rétractation concernant un abonnement payant dans un délai de 14 jours à compter de la
        souscription, sans avoir à motiver votre décision, en écrivant à <a href={`mailto:${LEGAL.supportEmail}`}>{LEGAL.supportEmail}</a>. Si vous avez demandé que le service
        commence pendant ce délai, vous ne payez que la partie de la période déjà fournie ; le reste vous est remboursé.
      </p>

      <h2>6. Utilisation raisonnable</h2>
      <p>
        N'utilisez pas FlipLens de manière abusive : pas de requêtes automatisées ou massives, pas de tentative de copier ou de revendre ses données, pas d'ingénierie
        inverse, pas d'atteinte à sa sécurité et pas d'utilisation pour des marchandises illicites. Nous pouvons restreindre ou suspendre les comptes qui enfreignent ces
        règles, après avertissement préalable lorsque cela est raisonnable.
      </p>

      <h2>7. Programme de parrainage</h2>
      <p>
        Les utilisateurs connectés peuvent inviter d'autres personnes au moyen d'un lien personnel. Pour les personnes qui créent un nouveau compte FlipLens via votre lien,
        vous recevez {REFERRAL.sharePct} % de chaque paiement qu'elles effectuent pour FlipLens (hors taxes) pendant les {REFERRAL.months} mois suivant leur premier paiement.
        Les gains deviennent disponibles {REFERRAL.holdDays} jours après chaque paiement et sont annulés si le paiement est remboursé ou fait l'objet d'une rétrofacturation.
        Vous pouvez demander un versement dès qu'au moins {money(REFERRAL.minPayoutMinor, 0, 'EUR')} sont disponibles, par PayPal ou par virement bancaire ; nous payons
        généralement sous 14 jours. Sont interdits l'auto-parrainage, la création de plusieurs comptes, la publicité trompeuse, le spam et les enchères sur le nom FlipLens
        dans les annonces des moteurs de recherche ; les gains issus de telles activités sont annulés. Vous êtes responsable des impôts éventuels sur vos gains et, le cas
        échéant, de l'identification de vos publications comme publicité. Les personnes qui s'inscrivent via un lien d'invitation reçoivent {REFERRAL.inviteeBonusChecks}{' '}
        vérifications gratuites supplémentaires pendant leurs {REFERRAL.inviteeBonusDays} premiers jours. Nous pouvons modifier le programme ou y mettre fin pour l'avenir ;
        les gains déjà disponibles seront néanmoins versés.
      </p>

      <h2>8. Services tiers</h2>
      <p>
        FlipLens utilise des données et des services de tiers tels qu'eBay, OpenAI, Google et Stripe. FlipLens n'est ni affilié à eBay ni à aucune place de marché vers
        laquelle il renvoie, ni approuvé ou sponsorisé par eux. Les liens vers d'autres places de marché ouvrent leurs sites web, qui ont leurs propres conditions.
      </p>

      <h2>9. Disponibilité et modifications</h2>
      <p>
        Nous nous efforçons de maintenir FlipLens disponible et précis, mais ne pouvons garantir ni un service ininterrompu ni l'exactitude de chaque estimation. Nous pouvons
        améliorer ou modifier les fonctionnalités. Si une modification supprime un élément essentiel d'une formule payante, vous pouvez résilier et obtenir le remboursement de
        la partie non utilisée de la période.
      </p>

      <h2>10. Responsabilité</h2>
      <p>
        Notre responsabilité est engagée sans limitation en cas de faute intentionnelle ou de faute lourde, d'atteinte à la vie, à l'intégrité physique ou à la santé, ainsi
        que lorsque des dispositions impératives, y compris le droit de la consommation, le prévoient. Dans les autres cas, nous ne sommes responsables d'une faute légère
        qu'en cas de manquement à une obligation essentielle, et uniquement pour le dommage typique et prévisible. Nous ne sommes pas responsables des décisions d'achat ou de
        vente que vous prenez sur la base d'une estimation, ni des pertes résultant de données de tiers inexactes, sauf dans les cas indiqués ci-dessus.
      </p>

      <h2>11. Fin du contrat</h2>
      <p>
        Vous pouvez cesser d'utiliser FlipLens et supprimer vos données à tout moment. Nous pouvons mettre fin au service à votre égard moyennant un préavis de 30 jours, ou
        immédiatement en cas de manquement grave aux présentes conditions. Si nous mettons fin au service sans motif, les périodes déjà payées sont remboursées au prorata.
      </p>

      <h2>12. Droit applicable et litiges</h2>
      <p>
        Les présentes conditions sont régies par le droit {country}. Si vous êtes un consommateur, vous conservez en outre la protection des dispositions impératives
        du pays où vous résidez et pouvez saisir les tribunaux de votre lieu de résidence. Veuillez d'abord nous contacter à l'adresse{' '}
        <a href={`mailto:${LEGAL.supportEmail}`}>{LEGAL.supportEmail}</a> ; nous nous efforçons de résoudre chaque problème directement.
      </p>

      <h2>13. Modification des présentes conditions</h2>
      <p>
        Nous pouvons mettre à jour les présentes conditions. Nous vous en informerons dans l'application au moins 30 jours avant l'entrée en vigueur de toute modification
        importante. Si vous n'êtes pas d'accord, vous pouvez résilier avant cette date.
      </p>
    </LegalLayout>
  );
}
