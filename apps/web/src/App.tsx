import { useCallback, useEffect, useRef, useState } from 'react';
import { FEE_PRESETS, type FeePresetId } from '@fliplens/core';
import { api, ApiError, type Health, type ServerScan, type ValuationResponse } from './api.js';
import { BarcodeScanner } from './BarcodeScanner.js';
import { BenchmarkAdd } from './BenchmarkAdd.js';
import {
  applyCandidate,
  buildRequest,
  CAPACITY_CATEGORIES,
  draftFromScan,
  newDraft,
  type Draft,
  type Identification,
  type ProductDraft,
} from './flow.js';
import { loadSettings, saveSettings, type Settings } from './storage.js';
import { track } from './track.js';
import { IconBack, IconClock, IconScan, IconUser } from './ui/icons.js';
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
  | { name: 'profile' };

const TITLES: Partial<Record<Route['name'], string>> = { confirm: 'Identify', price: 'Price', result: 'Verdict', scan: 'Saved scan', profile: 'Profile' };
const DEV_KEY = 'fliplens.devtools.v1';
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
  const dbOn = health?.db === 'connected';
  const correctedOnce = useRef(false);

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
    const onPop = () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
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
  useEffect(() => {
    if (!dbOn) return;
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
  }, [dbOn, refreshScans]);

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
      return { ...d, product: { ...d.product, ...p }, edited: d.edited || edited };
    });
  }

  async function runValuation(d: Draft) {
    setBusy(true);
    setFlowError(null);
    track('valuation_started', { method: d.method, category: d.product.category });
    try {
      const r = await api.valuation(buildRequest(d, settings));
      setResp(r);
      track(r.result.status === 'ok' ? 'valuation_completed' : 'valuation_failed', {
        category: d.product.category,
        ...(r.result.status === 'ok'
          ? { decision: r.result.decision.decision, confidence: r.result.estimate.confidence.level, comparables: r.result.estimate.distribution.count }
          : { reason: r.result.reason }),
      });
      if (r.scanId) refreshScans();
      go({ name: 'result' });
    } catch (e) {
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

  const query = [draft.product.brand, draft.product.model, CAPACITY_CATEGORIES.includes(draft.product.category) ? draft.product.capacity : '']
    .filter((x) => x.trim())
    .join(' ');
  const visionOn = health?.vision.configured ?? false;
  const inFlow = ['confirm', 'price', 'result', 'scan'].includes(route.name) || (route.name === 'profile' && stack.length > 2);
  const activeTab = route.name === 'history' || route.name === 'scan' ? 'history' : route.name === 'profile' ? 'profile' : 'home';

  return (
    <div className="shell">
      <header className="appbar">
        {inFlow ? (
          <button type="button" className="icon-btn plain" onClick={back} aria-label="Back"><IconBack /></button>
        ) : (
          <div className="logo"><img src="/icons/icon.svg" alt="" width={26} height={26} /> FlipLens</div>
        )}
        {inFlow && <div className="appbar-title">{TITLES[route.name]}</div>}
        <div className="appbar-end" />
      </header>

      {health === null && <div className="banner warn inset">Server not reachable. Run <code>pnpm dev</code>.</div>}
      {health && !health.sources.ebay && <div className="banner warn inset">eBay keys missing on the server: valuations will fail.</div>}

      <main className="content">
        {route.name === 'home' && (
          <Home
            visionEnabled={visionOn}
            recent={scans ?? []}
            onPhotos={startPhotos}
            onBarcode={() => setScanning(true)}
            onManual={startManual}
            onOpenScan={(s) => go({ name: 'scan', scan: s })}
            onSeeHistory={() => tab({ name: 'history' })}
          />
        )}
        {route.name === 'confirm' && (
          <Confirm
            draft={draft}
            identifying={identifying}
            error={flowError}
            onChangeProduct={changeProduct}
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
            {devTools && draft.photos.length > 0 && <BenchmarkAdd photos={draft.photos} request={buildRequest(draft, settings)} />}
          </Result>
        )}
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
            onDataDeleted={() => {
              setScans([]);
              tab({ name: 'home' });
            }}
          />
        )}
      </main>

      {scanning && <BarcodeScanner onCode={onBarcode} onClose={closeScanner} />}

      {!inFlow && (
        <nav className="tabbar" aria-label="Main">
          <button type="button" className={activeTab === 'home' ? 'on' : ''} onClick={() => tab({ name: 'home' })}>
            <IconScan />
            <span>Scan</span>
          </button>
          <button type="button" className={activeTab === 'history' ? 'on' : ''} onClick={() => tab({ name: 'history' })}>
            <IconClock />
            <span>History</span>
          </button>
          <button type="button" className={activeTab === 'profile' ? 'on' : ''} onClick={() => tab({ name: 'profile' })}>
            <IconUser />
            <span>Profile</span>
          </button>
        </nav>
      )}
    </div>
  );
}
