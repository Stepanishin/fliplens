import { useCallback, useEffect, useRef, useState } from 'react';
import { FEE_PRESETS, type CategorySlug, type FeePresetId } from '@fliplens/core';
import { api, ApiError, type Account, type BillingInfo, type Health, type ServerScan, type ValuationResponse } from './api.js';
import { Plans } from './screens/Plans.js';
import { Landing } from './screens/Landing.js';
import { Admin } from './screens/Admin.js';
import { signOutGoogle } from './ui/GoogleButton.js';
import { BarcodeScanner } from './BarcodeScanner.js';
import { BenchmarkAdd } from './BenchmarkAdd.js';
import {
  applyCandidate,
  buildRequest,
  showsCapacity,
  draftFromScan,
  newDraft,
  type Draft,
  type Identification,
  type ProductDraft,
} from './flow.js';
import { loadSettings, resetDeviceId, saveSettings, type Settings } from './storage.js';
import { track } from './track.js';
import { IconBack, IconCamera, IconClock, IconHome, IconSpark, IconUser } from './ui/icons.js';
import { resizeToJpegDataUrl } from './image.js';
import { Confirm } from './screens/Confirm.js';
import { History, ScanDetail } from './screens/History.js';
import { Home } from './screens/Home.js';
import { Price } from './screens/Price.js';
import { Profile } from './screens/Profile.js';
import { Result } from './screens/Result.js';

type Route =
  | { name: 'home' }
  | { name: 'confirm' }
  | { name: 'price' }
  | { name: 'result' }
  | { name: 'history' }
  | { name: 'scan'; scan: ServerScan }
  | { name: 'profile' }
  | { name: 'plans' }
  | { name: 'admin' };

const TITLES: Partial<Record<Route['name'], string>> = { confirm: 'Identify', price: 'Price', result: 'Verdict', scan: 'Saved scan', profile: 'Profile', admin: 'Admin' };
const DEV_KEY = 'fliplens.devtools.v1';
/** Position of the scan-flow screens in the stepper. */
const STEP: Partial<Record<Route['name'], number>> = { confirm: 0, price: 1, result: 2 };
const STEP_LABELS = ['Identify', 'Price', 'Verdict'] as const;

const AUTO_PICK_CONFIDENCE = 0.6;

export function App() {
  const [health, setHealth] = useState<Health | null | undefined>(undefined);
  const [stack, setStack] = useState<Route[]>([{ name: 'home' }]);
  const route = stack[stack.length - 1]!;
  const [draft, setDraft] = useState<Draft>(() => newDraft('manual'));
  const [identifying, setIdentifying] = useState(false);
  const [flowError, setFlowError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resp, setResp] = useState<ValuationResponse | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scans, setScans] = useState<ServerScan[] | null>(null);
  const [settings, setSettingsState] = useState<Settings>(loadSettings);
  const [devTools, setDevTools] = useState(() => {
    try {
      return localStorage.getItem(DEV_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [account, setAccount] = useState<Account | null>(null);
  const [meLoaded, setMeLoaded] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  /** The public start page, also reachable when signed in (/welcome, "About FlipLens"). */
  const [welcome, setWelcome] = useState(() => window.location.pathname === '/welcome');
  const [authError, setAuthError] = useState<string | null>(null);
  const [billing, setBilling] = useState<BillingInfo | null>(null);
  const [plansNotice, setPlansNotice] = useState<string | null>(null);
  const dbOn = health?.db === 'connected';
  const correctedOnce = useRef(false);
  const cameraRef = useRef<HTMLInputElement>(null);

  // ---------- navigation (the system back button pops the stack) ----------
  const go = useCallback((r: Route, replace = false) => {
    setStack((s) => (replace ? [...s.slice(0, -1), r] : [...s, r]));
    if (!replace) window.history.pushState({ depth: Date.now() }, '');
    window.scrollTo(0, 0);
  }, []);
  const tab = useCallback((r: Route) => {
    setStack(r.name === 'home' ? [r] : [{ name: 'home' }, r]);
    window.scrollTo(0, 0);
  }, []);
  useEffect(() => {
    const onPop = () => {
      setWelcome(window.location.pathname === '/welcome');
      setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  const back = () => {
    if (stack.length > 1) window.history.back();
  };

  // ---------- server state ----------
  useEffect(() => {
    api.health().then(setHealth, () => setHealth(null));
  }, []);
  const refreshScans = useCallback(() => {
    api.scans().then(setScans, () => setScans(null));
  }, []);
  const refreshBilling = useCallback(() => {
    api.billing().then(setBilling, () => setBilling(null));
  }, []);
  const loadAccountState = useCallback(() => {
    api.me().then(
      (m) => {
        setAccount(m.account);
        setIsAdmin(m.isAdmin);
        setMeLoaded(true);
      },
      () => {
        setAccount(null);
        setMeLoaded(true);
      },
    );
    refreshBilling();
    refreshScans();
    api.settings().then(
      (s) => {
        if (s && s.feePreset in FEE_PRESETS) {
          const merged: Settings = {
            country: s.country,
            preset: s.feePreset as FeePresetId,
            shippingCost: s.shippingCostMinor / 100,
            targetRoiPct: s.targetRoiPct,
          };
          setSettingsState(merged);
          saveSettings(merged);
        }
      },
      () => undefined,
    );
  }, [refreshScans, refreshBilling]);
  useEffect(() => {
    if (dbOn) loadAccountState();
  }, [dbOn, loadAccountState]);
  // Any API call answered with sign_in_required (e.g. signed out on another device): back to the start page.
  useEffect(() => {
    const onSignedOut = () => {
      setAccount(null);
      setScans([]);
    };
    window.addEventListener('fliplens:signed-out', onSignedOut);
    return () => window.removeEventListener('fliplens:signed-out', onSignedOut);
  }, []);

  // Back from Stripe Checkout: the webhook may land a moment later, so poll billing briefly.
  useEffect(() => {
    const status = new URLSearchParams(window.location.search).get('billing');
    if (!status) return;
    window.history.replaceState(null, '', window.location.pathname);
    if (status === 'success') {
      setPlansNotice('Thanks! Your subscription is being activated.');
      track('subscription_started', { step: 'returned' });
      let n = 0;
      const t = window.setInterval(() => {
        refreshBilling();
        if (++n >= 5) window.clearInterval(t);
      }, 1500);
    } else setPlansNotice('Checkout cancelled. Nothing was charged.');
    go({ name: 'plans' });
  }, [go, refreshBilling]);

  function openPlans(notice: string | null = null, asTab = false) {
    setPlansNotice(notice);
    track('subscription_viewed', { plan: billing?.quota.plan ?? null });
    refreshBilling();
    // The tab bar switches to Plans; links elsewhere (quota card, Profile) open it as a step with a back arrow.
    if (asTab) tab({ name: 'plans' });
    else go({ name: 'plans' });
  }

  async function signIn(credential: string) {
    setAuthError(null);
    try {
      const r = await api.googleLogin(credential);
      setAccount(r.account);
      track('signed_in', { provider: 'google' });
      loadAccountState();
    } catch (e) {
      setAuthError(e instanceof ApiError ? e.message : 'Sign-in failed');
    }
  }

  async function signOut() {
    await api.logout().catch(() => undefined);
    signOutGoogle();
    resetDeviceId();
    setAccount(null);
    setScans([]);
    tab({ name: 'home' });
    loadAccountState();
  }

  const saveTimer = useRef<number | undefined>(undefined);
  const setSettings = (s: Settings) => {
    setSettingsState(s);
    saveSettings(s);
    if (!dbOn) return;
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      void api
        .saveSettings({
          country: s.country,
          currency: 'EUR',
          feePreset: s.preset,
          shippingCostMinor: Math.round(s.shippingCost * 100),
          targetRoiPct: Math.round(s.targetRoiPct),
        })
        .catch(() => undefined);
    }, 600);
  };

  // ---------- scan flow ----------
  const withIdentification = (d: Draft, r: Identification): Draft => {
    const top = r.candidates[0];
    const next = { ...d, identification: r };
    return top && top.confidence >= AUTO_PICK_CONFIDENCE ? applyCandidate(next, top, 0, r) : next;
  };

  async function identifyPhotos(photos: string[]) {
    setIdentifying(true);
    setFlowError(null);
    try {
      const r = await api.identify(photos);
      track('product_detected', { method: 'photo', found: r.candidates.length > 0, confidence: r.candidates[0]?.confidence ?? null });
      setDraft((d) => withIdentification({ ...d, photos }, r));
    } catch (e) {
      setFlowError(e instanceof ApiError ? e.message : 'Recognition failed. Type the model instead.');
    } finally {
      setIdentifying(false);
    }
  }

  function startPhotos(photos: string[]) {
    correctedOnce.current = false;
    track('scan_started', { method: 'photo' });
    track('image_uploaded', { count: photos.length });
    setDraft({ ...newDraft('photo'), photos });
    setResp(null);
    go({ name: 'confirm' });
    void identifyPhotos(photos);
  }

  const onBarcode = useCallback(
    async (code: string) => {
      setScanning(false);
      correctedOnce.current = false;
      track('scan_started', { method: 'barcode' });
      track('barcode_scanned', {});
      setDraft(newDraft('barcode'));
      setResp(null);
      go({ name: 'confirm' });
      setIdentifying(true);
      setFlowError(null);
      try {
        const r = await api.identifyBarcode(code);
        track('product_detected', { method: 'barcode', found: r.candidates.length > 0, confidence: r.candidates[0]?.confidence ?? null });
        setDraft((d) => withIdentification(d, r));
      } catch (e) {
        setFlowError(e instanceof ApiError ? e.message : 'Barcode lookup failed. Type the model instead.');
      } finally {
        setIdentifying(false);
      }
    },
    [go],
  );
  const closeScanner = useCallback(() => setScanning(false), []);

  const onDetectedCategory = useCallback((c: CategorySlug) => {
    setDraft((d) => (d.product.category === '' ? { ...d, product: { ...d.product, category: c, categoryAuto: true } } : d));
  }, []);

  function startManual() {
    correctedOnce.current = false;
    track('scan_started', { method: 'manual' });
    setDraft(newDraft('manual'));
    setResp(null);
    setFlowError(null);
    go({ name: 'confirm' });
  }

  function changeProduct(p: Partial<ProductDraft>) {
    setDraft((d) => {
      const edited = d.identification !== null && d.chosenIndex !== null;
      if (edited && !correctedOnce.current) {
        correctedOnce.current = true;
        track('product_corrected', { method: d.method, field: Object.keys(p)[0] ?? null });
      }
      let product = { ...d.product, ...p };
      // A detected category belongs to the old name: typing a new brand/model re-detects it.
      if (d.product.categoryAuto && (p.brand !== undefined || p.model !== undefined)) product = { ...product, category: '', categoryAuto: false };
      return { ...d, product, edited: d.edited || edited };
    });
  }

  async function runValuation(d: Draft) {
    setBusy(true);
    setFlowError(null);
    track('valuation_started', { method: d.method, category: d.product.category });
    try {
      const r = await api.valuation(buildRequest(d, settings));
      setResp(r);
      // Keep the category the server detected, so "Edit" shows it and the next check uses it.
      if (r.categoryDetected) setDraft((x) => ({ ...x, product: { ...x.product, category: r.category, categoryAuto: true } }));
      track(r.result.status === 'ok' ? 'valuation_completed' : 'valuation_failed', {
        category: d.product.category,
        ...(r.result.status === 'ok'
          ? { decision: r.result.decision.decision, confidence: r.result.estimate.confidence.level, comparables: r.result.estimate.distribution.count }
          : { reason: r.result.reason }),
      });
      if (r.scanId) refreshScans();
      refreshBilling();
      go({ name: 'result' });
    } catch (e) {
      if (e instanceof ApiError && e.code === 'quota_exceeded') {
        track('valuation_failed', { reason: 'quota' });
        openPlans(e.message);
        return;
      }
      track('valuation_failed', { reason: 'error' });
      setFlowError(e instanceof ApiError ? e.message : 'Valuation failed.');
    } finally {
      setBusy(false);
    }
  }

  function newScan() {
    setDraft(newDraft('manual'));
    setResp(null);
    tab({ name: 'home' });
  }

  const query = [draft.product.brand, draft.product.model, showsCapacity(draft.product.category) ? draft.product.capacity : '']
    .filter((x) => x.trim())
    .join(' ');
  const visionOn = health?.vision.configured ?? false;
  const inFlow = ['confirm', 'price', 'result', 'scan', 'admin'].includes(route.name) || (route.name === 'plans' && stack.length > 2) || (route.name === 'profile' && stack.length > 2);
  const activeTab = route.name === 'history' || route.name === 'scan' ? 'history' : route.name === 'profile' ? 'profile' : route.name === 'plans' ? 'plans' : 'home';

  // Signed-in only: without an account the start page is all there is (with a database; local dev without one stays open).
  const showLanding = (dbOn && meLoaded && !account) || welcome;
  if (showLanding) {
    return (
      <Landing
        signedIn={account !== null}
        onOpenApp={() => {
          window.history.replaceState(null, '', '/');
          setWelcome(false);
          window.scrollTo(0, 0);
        }}
        googleClientId={health?.auth.google ?? null}
        authError={authError}
        onGoogleCredential={(c) => void signIn(c)}
      />
    );
  }
  if (dbOn && !meLoaded) {
    return <div className="boot"><img src="/icons/icon.svg" alt="" width={56} height={56} /></div>;
  }

  return (
    <div className="shell">
      <header className={`appbar ${STEP[route.name] !== undefined ? 'with-progress' : ''}`}>
        {inFlow ? (
          <button type="button" className="back-btn" onClick={back} aria-label="Back"><IconBack size={20} /></button>
        ) : (
          <div className="logo"><img src="/icons/icon.svg" alt="" width={26} height={26} /> FlipLens</div>
        )}
        <div className="appbar-title">
          {STEP[route.name] !== undefined ? (
            <div className="flow-head">
              <span className="flow-step">Step {STEP[route.name]! + 1} of 3</span>
              <span className="flow-name">{STEP_LABELS[STEP[route.name]!]}</span>
            </div>
          ) : inFlow ? (
            TITLES[route.name]
          ) : (
            ''
          )}
        </div>
        <div className="appbar-end">
          {!inFlow && (
            <button type="button" className="avatar-btn" onClick={() => tab({ name: 'profile' })} aria-label="Profile">
              {account?.picture ? <img src={account.picture} alt="" referrerPolicy="no-referrer" /> : <IconUser size={20} />}
            </button>
          )}
        </div>
        {STEP[route.name] !== undefined && (
          <div className="flow-progress" role="progressbar" aria-valuemin={1} aria-valuemax={3} aria-valuenow={STEP[route.name]! + 1}>
            {STEP_LABELS.map((l, n) => <span key={l} className={n <= STEP[route.name]! ? 'on' : ''} />)}
          </div>
        )}
      </header>

      {health === null && <div className="banner warn inset">Server not reachable. Run <code>pnpm dev</code>.</div>}
      {health && !health.sources.ebay && <div className="banner warn inset">eBay keys missing on the server: valuations will fail.</div>}

      <main className="content">
        {route.name === 'home' && (
          <Home
            account={account}
            visionEnabled={visionOn}
            recent={dbOn ? scans : []}
            onPhotos={startPhotos}
            onCamera={() => cameraRef.current?.click()}
            onBarcode={() => setScanning(true)}
            onManual={startManual}
            onOpenScan={(s) => go({ name: 'scan', scan: s })}
            onSeeHistory={() => tab({ name: 'history' })}
            quota={billing?.quota ?? null}
            onOpenPlans={() => openPlans()}
          />
        )}
        {route.name === 'confirm' && (
          <Confirm
            draft={draft}
            identifying={identifying}
            error={flowError}
            onChangeProduct={changeProduct}
            onDetectedCategory={onDetectedCategory}
            onChangeCondition={(c) => setDraft((d) => ({ ...d, condition: c }))}
            onPickCandidate={(i) =>
              setDraft((d) => {
                const c = d.identification?.candidates[i];
                return c && d.identification ? applyCandidate(d, c, i, d.identification) : d;
              })
            }
            onAddPhotos={(p) => {
              const photos = [...draft.photos, ...p].slice(0, 3);
              setDraft((d) => ({ ...d, photos }));
              void identifyPhotos(photos);
            }}
            onRemovePhoto={(i) => setDraft((d) => ({ ...d, photos: d.photos.filter((_, j) => j !== i) }))}
            onContinue={() => {
              setFlowError(null);
              go({ name: 'price' });
            }}
          />
        )}
        {route.name === 'price' && (
          <Price
            draft={draft}
            settings={settings}
            busy={busy}
            error={flowError}
            onChangePrice={(price) => setDraft((d) => ({ ...d, price }))}
            onSubmit={() => void runValuation(draft)}
            onEditSettings={() => go({ name: 'profile' })}
          />
        )}
        {route.name === 'result' && resp && (
          <Result
            resp={resp}
            query={query}
            country={settings.country}
            targetRoiPct={settings.targetRoiPct}
            onNewScan={newScan}
            onEdit={() => go({ name: 'confirm' })}
          >
            {devTools && isAdmin && draft.photos.length > 0 && <BenchmarkAdd photos={draft.photos} request={buildRequest(draft, settings)} />}
          </Result>
        )}
        {route.name === 'plans' && <Plans billing={billing} account={account} notice={plansNotice} onSignIn={() => tab({ name: 'profile' })} />}
        {route.name === 'admin' && isAdmin && <Admin />}
        {route.name === 'history' && <History scans={scans} dbOn={dbOn} onOpen={(s) => go({ name: 'scan', scan: s })} />}
        {route.name === 'scan' && (
          <ScanDetail
            scan={route.scan}
            onRecheck={() => {
              const d = draftFromScan(route.scan);
              setDraft(d);
              void runValuation(d);
            }}
            onDelete={() => {
              if (!window.confirm('Delete this scan?')) return;
              void api.deleteScan(route.scan.id).then(() => {
                refreshScans();
                back();
              });
            }}
          />
        )}
        {route.name === 'profile' && (
          <Profile
            billing={billing}
            onOpenPlans={() => openPlans()}
            account={account}
            googleClientId={health?.auth.google ?? null}
            onGoogleCredential={(c) => void signIn(c)}
            onSignOut={() => void signOut()}
            authError={authError}
            settings={settings}
            onChange={setSettings}
            dbOn={dbOn}
            version={health?.pricingAlgorithmVersion ?? 'offline'}
            devTools={devTools}
            onDevTools={(on) => {
              setDevTools(on);
              try {
                localStorage.setItem(DEV_KEY, on ? '1' : '0');
              } catch {
                // storage unavailable: the toggle just won't persist
              }
            }}
            isAdmin={isAdmin}
            onOpenAdmin={() => go({ name: 'admin' })}
            onOpenWelcome={() => {
              window.history.pushState(null, '', '/welcome');
              setWelcome(true);
              window.scrollTo(0, 0);
            }}
            onDataDeleted={() => {
              setScans([]);
              tab({ name: 'home' });
            }}
          />
        )}
      </main>

      {scanning && <BarcodeScanner onCode={onBarcode} onClose={closeScanner} />}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={async (e) => {
          const files = [...(e.target.files ?? [])].slice(0, 3);
          e.target.value = '';
          if (files.length > 0) startPhotos(await Promise.all(files.map((f) => resizeToJpegDataUrl(f))));
        }}
      />

      {
        <nav className="tabbar" aria-label="Main">
          <button type="button" className={activeTab === 'home' ? 'on' : ''} onClick={() => tab({ name: 'home' })}>
            <IconHome />
            <span>Home</span>
          </button>
          <button type="button" className={activeTab === 'history' ? 'on' : ''} onClick={() => tab({ name: 'history' })}>
            <IconClock />
            <span>History</span>
          </button>
          <button type="button" className="fab" onClick={() => cameraRef.current?.click()} disabled={!visionOn} aria-label="Scan item with the camera">
            <IconCamera size={26} />
          </button>
          <button type="button" className={activeTab === 'plans' ? 'on' : ''} onClick={() => openPlans(null, true)}>
            <IconSpark />
            <span>Plans</span>
          </button>
          <button type="button" className={activeTab === 'profile' ? 'on' : ''} onClick={() => tab({ name: 'profile' })}>
            <IconUser />
            <span>Profile</span>
          </button>
        </nav>
      }
    </div>
  );
}
