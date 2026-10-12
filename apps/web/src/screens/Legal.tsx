import type { ReactNode } from 'react';
import { PLANS } from '@fliplens/core';
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
});

/** Country names used in the governing-law clause. */
const COUNTRY_DE: Record<string, string> = { Slovenia: 'Slowenien', Germany: 'Deutschland', Austria: 'Österreich' };
const country = LANG === 'de' ? (COUNTRY_DE[LEGAL.governingCountry] ?? LEGAL.governingCountry) : LEGAL.governingCountry;

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
  return LANG === 'de' ? <PrivacyPolicyDe /> : <PrivacyPolicyEn />;
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

const eur = (minor: number): string => money(minor, 2);

export function TermsOfService() {
  return LANG === 'de' ? <TermsOfServiceDe /> : <TermsOfServiceEn />;
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

      <h2>7. Third-party services</h2>
      <p>
        FlipLens uses data and services from third parties such as eBay, OpenAI, Google and Stripe. FlipLens is not affiliated with, endorsed by or
        sponsored by eBay or any marketplace we link to. Links to other marketplaces open their websites, which have their own terms.
      </p>

      <h2>8. Availability and changes</h2>
      <p>
        We work to keep FlipLens available and accurate but cannot guarantee uninterrupted service or that every estimate is correct. We may improve or change
        features. If a change removes a core part of a paid plan, you may cancel and receive a refund for the unused part of the period.
      </p>

      <h2>9. Liability</h2>
      <p>
        We are liable without limitation for intent and gross negligence, for injury to life, body or health, and where mandatory law, including consumer law,
        provides so. Otherwise we are liable for slight negligence only if we breach an essential obligation, and then only for typical, foreseeable damage.
        We are not liable for purchase or sale decisions you make based on an estimate, or for losses from inaccurate third-party data, except as stated above.
      </p>

      <h2>10. Ending the agreement</h2>
      <p>
        You can stop using FlipLens and delete your data at any time. We may end the service for you with 30 days' notice, or immediately for serious breach of
        these terms. Paid periods already paid for are refunded pro rata if we end the service without cause.
      </p>

      <h2>11. Law and disputes</h2>
      <p>
        These terms are governed by the law of {country}. If you are a consumer, you also keep the protection of the mandatory laws of the country
        where you live, and you can bring claims in your local courts. Please contact us first at <a href={`mailto:${LEGAL.supportEmail}`}>{LEGAL.supportEmail}</a>; we try to
        solve every issue directly.
      </p>

      <h2>12. Changes to these terms</h2>
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

      <h2>7. Dienste Dritter</h2>
      <p>
        FlipLens nutzt Daten und Dienste Dritter wie eBay, OpenAI, Google und Stripe. FlipLens ist weder mit eBay noch mit einem der verlinkten Marktplätze verbunden,
        wird von ihnen nicht unterstützt und nicht gesponsert. Links zu anderen Marktplätzen öffnen deren Websites, für die eigene Bedingungen gelten.
      </p>

      <h2>8. Verfügbarkeit und Änderungen</h2>
      <p>
        Wir bemühen uns, FlipLens verfügbar und genau zu halten, können aber keinen unterbrechungsfreien Betrieb und nicht die Richtigkeit jeder Schätzung garantieren.
        Wir können Funktionen verbessern oder ändern. Entfällt durch eine Änderung ein wesentlicher Bestandteil eines kostenpflichtigen Tarifs, können Sie kündigen und
        erhalten eine Erstattung für den nicht genutzten Teil des Zeitraums.
      </p>

      <h2>9. Haftung</h2>
      <p>
        Wir haften unbeschränkt bei Vorsatz und grober Fahrlässigkeit, bei Verletzung von Leben, Körper oder Gesundheit sowie soweit zwingendes Recht, einschließlich des
        Verbraucherrechts, dies vorsieht. Im Übrigen haften wir für leichte Fahrlässigkeit nur bei Verletzung einer wesentlichen Vertragspflicht und dann nur für den
        typischen, vorhersehbaren Schaden. Wir haften nicht für Kauf- oder Verkaufsentscheidungen, die Sie auf Grundlage einer Schätzung treffen, oder für Verluste aus
        ungenauen Daten Dritter, außer wie oben angegeben.
      </p>

      <h2>10. Beendigung</h2>
      <p>
        Sie können die Nutzung von FlipLens jederzeit beenden und Ihre Daten löschen. Wir können den Dienst für Sie mit einer Frist von 30 Tagen beenden oder bei einem
        schweren Verstoß gegen diese Bedingungen fristlos. Bereits bezahlte Zeiträume werden anteilig erstattet, wenn wir den Dienst ohne wichtigen Grund beenden.
      </p>

      <h2>11. Anwendbares Recht und Streitigkeiten</h2>
      <p>
        Für diese Bedingungen gilt das Recht von {country}. Als Verbraucher behalten Sie zusätzlich den Schutz der zwingenden Vorschriften des Landes, in dem Sie wohnen,
        und können Ansprüche vor den Gerichten an Ihrem Wohnort geltend machen. Bitte wenden Sie sich zuerst an{' '}
        <a href={`mailto:${LEGAL.supportEmail}`}>{LEGAL.supportEmail}</a>; wir versuchen, jedes Anliegen direkt zu lösen.
      </p>

      <h2>12. Änderungen dieser Bedingungen</h2>
      <p>
        Wir können diese Bedingungen aktualisieren. Über wesentliche Änderungen informieren wir Sie in der App mindestens 30 Tage vor ihrem Inkrafttreten. Wenn Sie nicht
        einverstanden sind, können Sie vorher kündigen.
      </p>
    </LegalLayout>
  );
}
