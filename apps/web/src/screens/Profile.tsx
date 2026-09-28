import { FEE_PRESETS, type FeePresetId } from '@fliplens/core';
import { api, type Account, type BillingInfo } from '../api.js';
import { GoogleButton } from '../ui/GoogleButton.js';
import { InstallApp } from '../ui/InstallApp.js';
import { LINK_COUNTRIES } from '../marketSearch.js';
import type { Settings } from '../storage.js';

interface Props {
  billing: BillingInfo | null;
  onOpenPlans: () => void;
  account: Account | null;
  googleClientId: string | null;
  onGoogleCredential: (credential: string) => void;
  onSignOut: () => void;
  authError: string | null;
  settings: Settings;
  onChange: (s: Settings) => void;
  dbOn: boolean;
  version: string;
  devTools: boolean;
  onDevTools: (on: boolean) => void;
  onDataDeleted: () => void;
  onOpenWelcome: () => void;
  isAdmin: boolean;
  onOpenAdmin: () => void;
}

const COUNTRY_NAMES: Record<string, string> = {
  AT: 'Austria', BE: 'Belgium', CZ: 'Czechia', DE: 'Germany', DK: 'Denmark', ES: 'Spain', FI: 'Finland', FR: 'France',
  GR: 'Greece', HR: 'Croatia', HU: 'Hungary', IE: 'Ireland', IT: 'Italy', LT: 'Lithuania', LU: 'Luxembourg', NL: 'Netherlands',
  PL: 'Poland', PT: 'Portugal', RO: 'Romania', SE: 'Sweden', SI: 'Slovenia', SK: 'Slovakia', GB: 'United Kingdom',
};

export function Profile({ billing, onOpenPlans, account, googleClientId, onGoogleCredential, onSignOut, authError, settings, onChange, dbOn, version, devTools, onDevTools, onDataDeleted, onOpenWelcome, isAdmin, onOpenAdmin }: Props) {
  const preset = FEE_PRESETS[settings.preset];

  async function exportData() {
    const data = await api.exportMyData();
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fliplens-export.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function deleteData() {
    if (!window.confirm('Delete all your scans and data on the server? This cannot be undone.')) return;
    await api.deleteMyData();
    onDataDeleted();
  }

  return (
    <div className="screen">
      <h1 className="screen-title">Profile</h1>

      {dbOn && (
        <section className="card account">
          {account ? (
            <div className="account-row">
              {account.picture ? <img src={account.picture} alt="" width={48} height={48} referrerPolicy="no-referrer" /> : <span className="avatar">{(account.name ?? account.email ?? '?').slice(0, 1)}</span>}
              <span className="account-main">
                <strong>{account.name ?? account.email}</strong>
                <span className="muted small">{account.email}</span>
              </span>
              <button type="button" className="ghost" onClick={onSignOut}>Sign out</button>
            </div>
          ) : (
            <>
              <h2>Sign in</h2>
              <p className="muted small">Keep your scans and settings across devices. Your current scans move into your account.</p>
              <p className="muted small">By continuing you agree to the <a href="/terms">Terms</a> and <a href="/privacy">Privacy Policy</a>.</p>
              {googleClientId ? <GoogleButton clientId={googleClientId} onCredential={onGoogleCredential} /> : <p className="muted small">Sign-in is not configured on the server.</p>}
            </>
          )}
          {authError && <div className="banner bad">{authError}</div>}
        </section>
      )}

      {billing && (
        <section className="card">
          <div className="card-head">
            <h2>Plan</h2>
            <span className="pill soft">{billing.plans.find((p) => p.id === billing.quota.plan)?.name}</span>
          </div>
          <p className="muted small">{billing.quota.used} of {billing.quota.limit} checks used this month.</p>
          <button type="button" className="ghost wide" onClick={onOpenPlans}>{billing.quota.plan === 'free' ? 'See plans' : 'Manage plan'}</button>
        </section>
      )}

      <InstallApp variant="row" />

      <section className="card">
        <h2>Selling</h2>
        <label className="field">
          <span>Your country</span>
          <select value={settings.country} onChange={(e) => onChange({ ...settings, country: e.target.value })}>
            {LINK_COUNTRIES.map((c) => <option key={c} value={c}>{COUNTRY_NAMES[c] ?? c}</option>)}
          </select>
          <span className="hint">Decides which marketplaces we link to.</span>
        </label>
        <label className="field">
          <span>Default marketplace</span>
          <select value={settings.preset} onChange={(e) => onChange({ ...settings, preset: e.target.value as FeePresetId })}>
            {Object.entries(FEE_PRESETS).map(([id, p]) => <option key={id} value={id}>{p.label}</option>)}
          </select>
          <span className="hint">
            {preset.note} Checked {preset.lastVerifiedAt}{preset.sourceQuality === 'secondary' ? ' (secondary source)' : ''}.
          </span>
        </label>
        <div className="row2">
          <label className="field">
            <span>Typical shipping</span>
            <div className="input-affix">
              <span>€</span>
              <input inputMode="decimal" value={settings.shippingCost} onChange={(e) => onChange({ ...settings, shippingCost: Number(e.target.value.replace(',', '.')) || 0 })} />
            </div>
          </label>
          <label className="field">
            <span>Target ROI</span>
            <div className="input-affix">
              <input inputMode="numeric" value={settings.targetRoiPct} onChange={(e) => onChange({ ...settings, targetRoiPct: Number(e.target.value) || 0 })} />
              <span>%</span>
            </div>
          </label>
        </div>
        <p className="muted small">{dbOn ? 'Saved to your account on this device.' : 'Saved on this device only.'}</p>
      </section>

      {dbOn && (
        <section className="card">
          <h2>Your data</h2>
          <p className="muted small">Photos are never stored. Scans are kept until you delete them.</p>
          <div className="row2">
            <button type="button" className="ghost" onClick={() => void exportData()}>Export</button>
            <button type="button" className="ghost danger" onClick={() => void deleteData()}>Delete all</button>
          </div>
        </section>
      )}

      {isAdmin && (
        <button type="button" className="ghost wide" onClick={onOpenAdmin}>Admin: costs and usage</button>
      )}

      <section className="card">
        <label className="toggle">
          <span>
            <strong>Developer tools</strong>
            <span className="muted small">Benchmark recording on the result screen.</span>
          </span>
          <input type="checkbox" checked={devTools} onChange={(e) => onDevTools(e.target.checked)} />
        </label>
      </section>

      <p className="muted small center">
        <button type="button" className="link" onClick={onOpenWelcome}>About FlipLens</button> · <a href="/privacy">Privacy Policy</a> · <a href="/terms">Terms of Service</a>
        <br />
        FlipLens · {version}
      </p>
    </div>
  );
}
