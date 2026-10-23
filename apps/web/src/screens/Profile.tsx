import { AlertsList } from '../ui/AlertsList.js';
import { FEE_PRESETS, presetsForCountry, type FeePresetId } from '@fliplens/core';
import { api, type Account, type BillingInfo } from '../api.js';
import { GoogleButton } from '../ui/GoogleButton.js';
import { InstallApp } from '../ui/InstallApp.js';
import { InstallExtension } from '../ui/InstallExtension.js';
import { IconChevron } from '../ui/icons.js';
import { LINK_COUNTRIES } from '../marketSearch.js';
import type { Settings } from '../storage.js';
import { LANG, LANG_NAMES, LANGS, LOCALE, setLang, tr, presetText, currencySymbol } from '../i18n.js';

const T = tr({
  en: {
    inviteTitle: 'Invite friends, earn 20%',
    inviteSub: 'Get 20% of what they pay for 6 months',
    profile: 'Profile',
    deleteConfirm: 'Delete all your scans and data on the server? This cannot be undone.',
    signOut: 'Sign out',
    signIn: 'Sign in',
    signInLead: 'Keep your scans and settings across devices. Your current scans move into your account.',
    agreeA: 'By continuing you agree to the ',
    terms: 'Terms',
    and: ' and ',
    privacy: 'Privacy Policy',
    agreeEnd: '',
    signInOff: 'Sign-in is not configured on the server.',
    plan: 'Plan',
    used: (u: number, l: number) => `${u} of ${l} checks used this month.`,
    seePlans: 'See plans',
    managePlan: 'Manage plan',
    language: 'Language',
    selling: 'Selling',
    country: 'Your country',
    countryHint: 'Decides which marketplaces we link to.',
    marketplace: 'Default marketplace',
    checked: (d: string) => ` Checked ${d}`,
    secondary: ' (secondary source)',
    shipping: 'Typical shipping',
    roi: 'Target ROI',
    savedAccount: 'Saved to your account on this device.',
    savedDevice: 'Saved on this device only.',
    data: 'Your data',
    dataLead: 'Photos are never stored. Scans are kept until you delete them.',
    exportBtn: 'Export',
    deleteAll: 'Delete all',
    about: 'About FlipLens',
    termsFull: 'Terms of Service',
  },
  de: {
    inviteTitle: 'Freunde einladen, 20 % verdienen',
    inviteSub: '20 % von allem, was sie 6 Monate lang zahlen',
    profile: 'Profil',
    deleteConfirm: 'Alle deine Scans und Daten auf dem Server löschen? Das kann nicht rückgängig gemacht werden.',
    signOut: 'Abmelden',
    signIn: 'Anmelden',
    signInLead: 'Behalte deine Scans und Einstellungen auf allen Geräten. Deine bisherigen Scans wandern in dein Konto.',
    agreeA: 'Mit dem Fortfahren stimmst du den ',
    terms: 'Nutzungsbedingungen',
    and: ' und der ',
    privacy: 'Datenschutzerklärung',
    agreeEnd: ' zu',
    signInOff: 'Die Anmeldung ist auf dem Server nicht eingerichtet.',
    plan: 'Tarif',
    used: (u: number, l: number) => `${u} von ${l} Checks diesen Monat genutzt.`,
    seePlans: 'Tarife ansehen',
    managePlan: 'Tarif verwalten',
    language: 'Sprache',
    selling: 'Verkaufen',
    country: 'Dein Land',
    countryHint: 'Bestimmt, auf welche Marktplätze wir verlinken.',
    marketplace: 'Standard-Marktplatz',
    checked: (d: string) => ` Geprüft am ${d}`,
    secondary: ' (Sekundärquelle)',
    shipping: 'Übliche Versandkosten',
    roi: 'Ziel-ROI',
    savedAccount: 'In deinem Konto auf diesem Gerät gespeichert.',
    savedDevice: 'Nur auf diesem Gerät gespeichert.',
    data: 'Deine Daten',
    dataLead: 'Fotos werden nie gespeichert. Scans bleiben, bis du sie löschst.',
    exportBtn: 'Exportieren',
    deleteAll: 'Alles löschen',
    about: 'Über FlipLens',
    termsFull: 'Nutzungsbedingungen',
  },
  it: {
    inviteTitle: 'Invita amici, guadagna il 20 %',
    inviteSub: 'Ricevi il 20 % di quello che pagano per 6 mesi',
    profile: 'Profilo',
    deleteConfirm: 'Eliminare tutte le tue scansioni e i tuoi dati dal server? Non si può annullare.',
    signOut: 'Esci',
    signIn: 'Accedi',
    signInLead: 'Conserva scansioni e impostazioni su tutti i tuoi dispositivi. Le scansioni attuali passano nel tuo account.',
    agreeA: 'Continuando accetti i ',
    terms: 'Termini di utilizzo',
    and: " e l'",
    privacy: 'Informativa sulla privacy',
    agreeEnd: '',
    signInOff: "L'accesso non è configurato sul server.",
    plan: 'Piano',
    used: (u: number, l: number) => `${u} di ${l} controlli usati questo mese.`,
    seePlans: 'Vedi i piani',
    managePlan: 'Gestisci piano',
    language: 'Lingua',
    selling: 'Vendita',
    country: 'Il tuo paese',
    countryHint: 'Decide a quali marketplace rimandiamo.',
    marketplace: 'Marketplace predefinito',
    checked: (d: string) => ` Verificato il ${d}`,
    secondary: ' (fonte secondaria)',
    shipping: 'Spedizione tipica',
    roi: 'ROI obiettivo',
    savedAccount: 'Salvato nel tuo account su questo dispositivo.',
    savedDevice: 'Salvato solo su questo dispositivo.',
    data: 'I tuoi dati',
    dataLead: 'Le foto non vengono mai salvate. Le scansioni restano finché non le elimini.',
    exportBtn: 'Esporta',
    deleteAll: 'Elimina tutto',
    about: 'Info su FlipLens',
    termsFull: 'Termini di servizio',
  },
  fr: {
    inviteTitle: 'Invite tes amis, gagne 20 %',
    inviteSub: 'Reçois 20 % de ce qu’ils paient pendant 6 mois',
    profile: 'Profil',
    deleteConfirm: 'Supprimer tous tes scans et tes données sur le serveur ? Impossible de revenir en arrière.',
    signOut: 'Se déconnecter',
    signIn: 'Se connecter',
    signInLead: 'Garde tes scans et réglages sur tous tes appareils. Tes scans actuels sont transférés dans ton compte.',
    agreeA: 'En continuant, tu acceptes les ',
    terms: "Conditions d'utilisation",
    and: ' et la ',
    privacy: 'Politique de confidentialité',
    agreeEnd: '',
    signInOff: "La connexion n'est pas configurée sur le serveur.",
    plan: 'Offre',
    used: (u: number, l: number) => `${u} vérifications sur ${l} utilisées ce mois-ci.`,
    seePlans: 'Voir les offres',
    managePlan: "Gérer l'offre",
    language: 'Langue',
    selling: 'Vente',
    country: 'Ton pays',
    countryHint: 'Détermine vers quelles plateformes nous renvoyons.',
    marketplace: 'Plateforme par défaut',
    checked: (d: string) => ` Vérifié le ${d}`,
    secondary: ' (source secondaire)',
    shipping: 'Frais de port habituels',
    roi: 'ROI visé',
    savedAccount: 'Enregistré dans ton compte sur cet appareil.',
    savedDevice: 'Enregistré uniquement sur cet appareil.',
    data: 'Tes données',
    dataLead: "Les photos ne sont jamais stockées. Les scans sont conservés jusqu'à ce que tu les supprimes.",
    exportBtn: 'Exporter',
    deleteAll: 'Tout supprimer',
    about: 'À propos de FlipLens',
    termsFull: "Conditions d'utilisation",
  },
});

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
  /** Invite friends / referral earnings. */
  onOpenReferral: () => void;
}

const COUNTRY_NAMES: Record<string, string> = {
  AT: 'Austria', BE: 'Belgium', CZ: 'Czechia', DE: 'Germany', DK: 'Denmark', ES: 'Spain', FI: 'Finland', FR: 'France',
  GR: 'Greece', HR: 'Croatia', HU: 'Hungary', IE: 'Ireland', IT: 'Italy', LT: 'Lithuania', LU: 'Luxembourg', NL: 'Netherlands',
  PL: 'Poland', PT: 'Portugal', RO: 'Romania', SE: 'Sweden', SI: 'Slovenia', SK: 'Slovakia', GB: 'United Kingdom',
};

/** Country names in the UI language (English keeps the list above). */
function countryName(code: string): string {
  if (LANG === 'en') return COUNTRY_NAMES[code] ?? code;
  try {
    return new Intl.DisplayNames([LOCALE], { type: 'region' }).of(code) ?? code;
  } catch {
    return COUNTRY_NAMES[code] ?? code;
  }
}

export function Profile({ billing, onOpenPlans, account, googleClientId, onGoogleCredential, onSignOut, authError, settings, onChange, dbOn, version, devTools, onDevTools, onDataDeleted, onOpenWelcome, isAdmin, onOpenAdmin, onOpenReferral }: Props) {
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
    if (!window.confirm(T.deleteConfirm)) return;
    await api.deleteMyData();
    onDataDeleted();
  }

  return (
    <div className="screen">
      <h1 className="screen-title">{T.profile}</h1>

      {isAdmin && (
        <button type="button" className="context-row admin-entry" onClick={onOpenAdmin}>
          <span>
            <strong>Admin panel</strong>
            <br />
            Users, visits, revenue and costs
          </span>
          <IconChevron size={18} />
        </button>
      )}

      {account && (
        <button type="button" className="context-row admin-entry" onClick={onOpenReferral}>
          <span>
            <strong>{T.inviteTitle}</strong>
            <br />
            {T.inviteSub}
          </span>
          <IconChevron size={18} />
        </button>
      )}

      {dbOn && (
        <section className="card account">
          {account ? (
            <div className="account-row">
              {account.picture ? <img src={account.picture} alt="" width={48} height={48} referrerPolicy="no-referrer" /> : <span className="avatar">{(account.name ?? account.email ?? '?').slice(0, 1)}</span>}
              <span className="account-main">
                <strong>{account.name ?? account.email}</strong>
                <span className="muted small">{account.email}</span>
              </span>
              <button type="button" className="ghost" onClick={onSignOut}>{T.signOut}</button>
            </div>
          ) : (
            <>
              <h2>{T.signIn}</h2>
              <p className="muted small">{T.signInLead}</p>
              <p className="muted small">{T.agreeA}<a href="/terms">{T.terms}</a>{T.and}<a href="/privacy">{T.privacy}</a>{T.agreeEnd}.</p>
              {googleClientId ? <GoogleButton clientId={googleClientId} onCredential={onGoogleCredential} /> : <p className="muted small">{T.signInOff}</p>}
            </>
          )}
          {authError && <div className="banner bad">{authError}</div>}
        </section>
      )}

      {billing && (
        <section className="card">
          <div className="card-head">
            <h2>{T.plan}</h2>
            <span className="pill soft">{billing.plans.find((p) => p.id === billing.quota.plan)?.name}</span>
          </div>
          <p className="muted small">{T.used(billing.quota.used, billing.quota.limit)}</p>
          <button type="button" className="ghost wide" onClick={onOpenPlans}>{billing.quota.plan === 'free' ? T.seePlans : T.managePlan}</button>
        </section>
      )}

      <InstallApp variant="row" />
      <InstallExtension />

      <section className="card">
        <h2>{T.language}</h2>
        <div className="seg" role="radiogroup" aria-label={T.language}>
          {LANGS.map((id) => (
            <button key={id} type="button" role="radio" aria-checked={LANG === id} className={LANG === id ? 'on' : ''} onClick={() => id !== LANG && setLang(id)} lang={id}>
              {LANG_NAMES[id]}
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>{T.selling}</h2>
        <label className="field">
          <span>{T.country}</span>
          <select
            value={settings.country}
            onChange={(e) => {
              // A new country suggests its own eBay (eBay.it for Italy, eBay.co.uk for the UK...); any preset can be picked after.
              const country = e.target.value;
              onChange({ ...settings, country, preset: settings.preset.startsWith('ebay_') ? presetsForCountry(country)[0]! : settings.preset });
            }}
          >
            {LINK_COUNTRIES.map((c) => <option key={c} value={c}>{countryName(c)}</option>)}
          </select>
          <span className="hint">{T.countryHint}</span>
        </label>
        <label className="field">
          <span>{T.marketplace}</span>
          <select value={settings.preset} onChange={(e) => onChange({ ...settings, preset: e.target.value as FeePresetId })}>
            {presetsForCountry(settings.country).map((id) => <option key={id} value={id}>{presetText(id, FEE_PRESETS[id]).label}</option>)}
          </select>
          <span className="hint">
            {presetText(settings.preset, preset).note}{T.checked(preset.lastVerifiedAt)}{preset.sourceQuality === 'secondary' ? T.secondary : ''}.
          </span>
        </label>
        <div className="row2">
          <label className="field">
            <span>{T.shipping}</span>
            <div className="input-affix">
              <span>{currencySymbol()}</span>
              <input inputMode="decimal" value={settings.shippingCost} onChange={(e) => onChange({ ...settings, shippingCost: Number(e.target.value.replace(',', '.')) || 0 })} />
            </div>
          </label>
          <label className="field">
            <span>{T.roi}</span>
            <div className="input-affix">
              <input inputMode="numeric" value={settings.targetRoiPct} onChange={(e) => onChange({ ...settings, targetRoiPct: Number(e.target.value) || 0 })} />
              <span>%</span>
            </div>
          </label>
        </div>
        <p className="muted small">{dbOn ? T.savedAccount : T.savedDevice}</p>
      </section>

      {dbOn && account && <AlertsList />}

      {dbOn && (
        <section className="card">
          <h2>{T.data}</h2>
          <p className="muted small">{T.dataLead}</p>
          <div className="row2">
            <button type="button" className="ghost" onClick={() => void exportData()}>{T.exportBtn}</button>
            <button type="button" className="ghost danger" onClick={() => void deleteData()}>{T.deleteAll}</button>
          </div>
        </section>
      )}

      {isAdmin && (
        <section className="card">
          <label className="toggle">
            <span>
              <strong>Developer tools</strong>
              <span className="muted small">Benchmark recording on the result screen.</span>
            </span>
            <input type="checkbox" checked={devTools} onChange={(e) => onDevTools(e.target.checked)} />
          </label>
        </section>
      )}

      <p className="muted small center">
        <button type="button" className="link" onClick={onOpenWelcome}>{T.about}</button> · <a href="/privacy">{T.privacy}</a> · <a href="/terms">{T.termsFull}</a>
        <br />
        FlipLens · {version}
      </p>
    </div>
  );
}
