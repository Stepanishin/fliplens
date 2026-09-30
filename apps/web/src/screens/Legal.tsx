import type { ReactNode } from 'react';
import { PLANS } from '@fliplens/core';
import { LEGAL, LEGAL_IS_DRAFT } from '../legal.js';

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
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
          <a className="ghost small-btn" href="/">Open app</a>
        </nav>
      </header>
      <article className="legal-body">
        {LEGAL_IS_DRAFT && (
          <div className="banner warn">
            Draft: the operator details below are placeholders. Fill them in (apps/web/src/legal.ts) and have this document reviewed by a lawyer before launch.
          </div>
        )}
        <h1>{title}</h1>
        <p className="muted">Effective {LEGAL.effectiveDate}</p>
        {children}
      </article>
      <footer className="lp-footer">
        <span>© {new Date().getFullYear()} {LEGAL.operator}</span>
        <span><a href="/privacy">Privacy Policy</a> · <a href="/terms">Terms of Service</a></span>
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
    Support: <a href={`mailto:${LEGAL.supportEmail}`}>{LEGAL.supportEmail}</a>
    <br />
    Privacy: <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>
  </p>
);

export function PrivacyPolicy() {
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
            <td>Usage events inside the app (for example "check started", "valuation completed", "comparables opened") with a few non-identifying details such as product category or decision</td>
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
        <li><strong>Hosting provider</strong> of the app and API: [to be named at launch].</li>
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

const eur = (minor: number): string => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(minor / 100);

export function TermsOfService() {
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
        monthly checks. Prices include VAT. Paid plans are billed monthly in advance through Stripe and renew automatically until cancelled. You can cancel at any time in
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
        These terms are governed by the law of {LEGAL.governingCountry}. If you are a consumer, you also keep the protection of the mandatory laws of the country
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
