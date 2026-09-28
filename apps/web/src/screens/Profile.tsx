import { FEE_PRESETS, type FeePresetId } from '@fliplens/core';
import { api } from '../api.js';
import { LINK_COUNTRIES } from '../marketSearch.js';
import type { Settings } from '../storage.js';

interface Props {
  settings: Settings;
  onChange: (s: Settings) => void;
  dbOn: boolean;
  version: string;
  devTools: boolean;
  onDevTools: (on: boolean) => void;
  onDataDeleted: () => void;
}

const COUNTRY_NAMES: Record<string, string> = {
  AT: 'Austria', BE: 'Belgium', CZ: 'Czechia', DE: 'Germany', DK: 'Denmark', ES: 'Spain', FI: 'Finland', FR: 'France',
  GR: 'Greece', HR: 'Croatia', HU: 'Hungary', IE: 'Ireland', IT: 'Italy', LT: 'Lithuania', LU: 'Luxembourg', NL: 'Netherlands',
  PL: 'Poland', PT: 'Portugal', RO: 'Romania', SE: 'Sweden', SI: 'Slovenia', SK: 'Slovakia', GB: 'United Kingdom',
};

export function Profile({ settings, onChange, dbOn, version, devTools, onDevTools, onDataDeleted }: Props) {
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

      <section className="card">
        <label className="toggle">
          <span>
            <strong>Developer tools</strong>
            <span className="muted small">Benchmark recording on the result screen.</span>
          </span>
          <input type="checkbox" checked={devTools} onChange={(e) => onDevTools(e.target.checked)} />
        </label>
      </section>

      <p className="muted small center">FlipLens · {version}</p>
    </div>
  );
}
