import { PLANS } from '@fliplens/core';
import { GoogleButton } from '../ui/GoogleButton.js';
import { IconBarcode, IconCamera, IconCheck, IconClock, IconEdit, IconScan, IconSpark } from '../ui/icons.js';

interface Props {
  /** Signed-in visitors (e.g. on /welcome) get "Open app" instead of the sign-in buttons. */
  signedIn: boolean;
  onOpenApp: () => void;
  googleClientId: string | null;
  authError: string | null;
  onGoogleCredential: (credential: string) => void;
}

const eur = (minor: number): string =>
  new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: minor % 100 === 0 ? 0 : 2 }).format(minor / 100);

/** Public start page for signed-out visitors: what it does, how, what it costs, and a way in. */
export function Landing({ signedIn, onOpenApp, googleClientId, authError, onGoogleCredential }: Props) {
  const toSignIn = () => (signedIn ? onOpenApp() : window.scrollTo({ top: 0, behavior: 'smooth' }));
  const signIn = signedIn ? (
    <button type="button" className="primary lp-open" onClick={onOpenApp}>Open app</button>
  ) : googleClientId ? (
    <GoogleButton clientId={googleClientId} onCredential={onGoogleCredential} />
  ) : (
    <p className="muted small">Sign-in is not configured on this server.</p>
  );

  return (
    <div className="landing">
      <header className="lp-nav">
        <div className="logo"><img src="/icons/icon.svg" alt="" width={28} height={28} /> FlipLens</div>
        <nav>
          <a href="#how">How it works</a>
          <a href="#pricing">Pricing</a>
          {signedIn || !googleClientId ? (
            <button type="button" className="ghost small-btn" onClick={onOpenApp}>Open app</button>
          ) : (
            <GoogleButton clientId={googleClientId} onCredential={onGoogleCredential} compact />
          )}
        </nav>
      </header>

      <section className="lp-hero">
        <div className="lp-hero-copy">
          <span className="lp-badge"><IconSpark size={14} /> For resellers in Europe</span>
          <h1>Know what it's worth <span>before you buy it.</span></h1>
          <p className="lp-lead">
            Snap a photo or scan the barcode at the flea market, enter the asking price, and get a clear buy or skip, with resale value,
            profit after fees and ROI from live marketplace listings.
          </p>
          <div className="lp-cta">
            {signIn}
            {!signedIn && <p className="lp-free-note">Free to try: {PLANS.free.monthlyValuations} checks every month, no card needed.</p>}
          </div>
          {!signedIn && <p className="muted small lp-consent">
            By continuing you agree to the <a href="/terms">Terms</a> and <a href="/privacy">Privacy Policy</a>.
          </p>}
          {authError && <div className="banner bad">{authError}</div>}
          <ul className="lp-trust">
            <li><IconCheck size={16} /> {PLANS.free.monthlyValuations} free checks every month</li>
            <li><IconCheck size={16} /> eBay listings from 5 EU countries</li>
            <li><IconCheck size={16} /> Photos are never stored</li>
          </ul>
        </div>

        <div className="lp-mock" aria-hidden="true">
          <div className="lp-phone">
            <div className="lp-phone-item">
              <strong>Nintendo Switch OLED</strong>
              <span>Good · asking €100</span>
            </div>
            <div className="hero d-strong_buy lp-mock-hero">
              <div className="hero-top">
                <span className="hero-icon"><IconCheck size={22} /></span>
                <div>
                  <div className="hero-title">Strong buy</div>
                  <div className="hero-sub">Worth it up to €124</div>
                </div>
              </div>
              <div className="hero-numbers">
                <div><span>Profit</span><strong>+€73</strong></div>
                <div><span>ROI</span><strong>73%</strong></div>
                <div><span>Sells for</span><strong>€179</strong></div>
              </div>
            </div>
            <div className="lp-mock-card">
              <div className="lp-mock-row"><span>Fast sale</span><strong>€161</strong></div>
              <div className="lp-mock-row main"><span>Expected</span><strong>€179</strong></div>
              <div className="lp-mock-row"><span>High ask</span><strong>€227</strong></div>
              <p>Based on 138 active listings in 5 EU countries</p>
            </div>
          </div>
        </div>
      </section>

      <section id="how" className="lp-section">
        <h2>Three taps, a few seconds</h2>
        <div className="lp-steps">
          <div className="lp-step">
            <span className="lp-step-icon"><IconCamera /></span>
            <h3>1. Scan</h3>
            <p>Photo of the item or its label, the barcode on the box, or just type the model. We identify the exact variant and let you correct it.</p>
          </div>
          <div className="lp-step">
            <span className="lp-step-icon"><IconEdit /></span>
            <h3>2. Enter the price</h3>
            <p>What the seller wants for it. Your marketplace, shipping and target ROI are remembered.</p>
          </div>
          <div className="lp-step">
            <span className="lp-step-icon"><IconScan /></span>
            <h3>3. Get the verdict</h3>
            <p>Strong buy, buy, borderline or skip, with the numbers and the reasons behind it.</p>
          </div>
        </div>
      </section>

      <section className="lp-section">
        <h2>Built for buying decisions, not guesses</h2>
        <div className="lp-features">
          <div className="lp-feature">
            <IconBarcode />
            <h3>Exact model, not "headphones"</h3>
            <p>XM4 is not XM5, 128 GB is not 256 GB, RF is not EF. Wrong variants, accessories, bundles and broken items are filtered out.</p>
          </div>
          <div className="lp-feature">
            <IconClock />
            <h3>Live market data</h3>
            <p>Comparable listings from eBay in Germany, France, Italy, Spain and the Netherlands, converted to euro. You can see every listing we used.</p>
          </div>
          <div className="lp-feature">
            <IconSpark />
            <h3>Profit after fees</h3>
            <p>Marketplace fees, shipping and your purchase price are taken off. You also get the maximum price worth paying.</p>
          </div>
          <div className="lp-feature">
            <IconCheck />
            <h3>Honest about uncertainty</h3>
            <p>Every verdict shows its confidence and risks. Not enough data? We say so instead of inventing a number.</p>
          </div>
        </div>
      </section>

      <section id="pricing" className="lp-section">
        <h2>Simple pricing</h2>
        <p className="lp-sub">Start free. Upgrade when FlipLens pays for itself.</p>
        <div className="lp-pricing">
          {Object.values(PLANS).map((p) => (
            <div key={p.id} className={`lp-plan ${p.id === 'pro' ? 'featured' : ''}`}>
              {p.id === 'pro' && <span className="pill d-buy">Popular</span>}
              <h3>{p.name}</h3>
              <div className="plan-price">
                <strong>{p.priceMonthlyMinor === 0 ? 'Free' : eur(p.priceMonthlyMinor)}</strong>
                {p.priceMonthlyMinor > 0 && <span className="muted">/ month</span>}
              </div>
              <ul className="list">{p.features.map((f) => <li key={f}>{f}</li>)}</ul>
            </div>
          ))}
        </div>
        <p className="muted small center">Prices include VAT. Cancel anytime.</p>
      </section>

      <section className="lp-section lp-faq">
        <h2>Questions</h2>
        <details>
          <summary>Where do the prices come from?</summary>
          <p>From active eBay listings in five EU countries. Asking prices are usually above what items finally sell for, so we adjust them down and always tell you how many listings the estimate is based on.</p>
        </details>
        <details>
          <summary>Which items work best?</summary>
          <p>Consumer electronics, gaming and cameras: headphones, phones, tablets, consoles, controllers, games, camera bodies and lenses. Fashion is not supported yet.</p>
        </details>
        <details>
          <summary>What happens to my photos and data?</summary>
          <p>Photos are only used to identify the item and are never stored. Your checks are kept until you delete them, and you can export or delete everything from your profile at any time.</p>
        </details>
        <details>
          <summary>Why do I need to sign in?</summary>
          <p>Your free checks, history and plan belong to your account, so they work on all your devices. Sign in with Google in one tap; there is no password to create.</p>
        </details>
      </section>

      <section className="lp-final">
        <h2>Your next find is waiting.</h2>
        <p>Check it before you pay for it.</p>
        <div className="lp-cta center">
          <button type="button" className="lp-final-btn" onClick={toSignIn}>{signedIn ? 'Open app' : 'Get started free'}</button>
        </div>
      </section>

      <footer className="lp-footer">
        <span>© {new Date().getFullYear()} FlipLens · <a href="/privacy">Privacy</a> · <a href="/terms">Terms</a></span>
        <span className="muted">Not affiliated with eBay. eBay data shown via the eBay API.</span>
      </footer>
    </div>
  );
}
