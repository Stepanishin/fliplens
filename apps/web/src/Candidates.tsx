import type { IdentificationResult } from './api.js';
import { CATEGORY_NAME, CONDITION_LABEL } from './format.js';
import { tr } from './i18n.js';

const T = tr({
  en: {
    isThis: 'Is this:',
    detected: 'Detected:',
    mount: (m: string) => `${m} mount`,
    guess: (c: string, notes: string | null) => `Condition guess: ${c}${notes ? ` (${notes})` : ''}. Please confirm below.`,
  },
  de: {
    isThis: 'Ist das:',
    detected: 'Erkannt:',
    mount: (m: string) => `${m}-Anschluss`,
    guess: (c: string, notes: string | null) => `Geschätzter Zustand: ${c}${notes ? ` (${notes})` : ''}. Bitte unten bestätigen.`,
  },
  it: {
    isThis: 'È questo?',
    detected: 'Rilevato:',
    mount: (m: string) => `attacco ${m}`,
    guess: (c: string, notes: string | null) => `Condizione stimata: ${c}${notes ? ` (${notes})` : ''}. Confermala qui sotto.`,
  },
  fr: {
    isThis: 'Est-ce :',
    detected: 'Détecté :',
    mount: (m: string) => `monture ${m}`,
    guess: (c: string, notes: string | null) => `État estimé : ${c}${notes ? ` (${notes})` : ''}. Confirme ci-dessous.`,
  },
});

interface Props {
  result: IdentificationResult;
  picked: number | null;
  onChoose: (i: number) => void;
  /** Label for identifyingText: text read on the item (photo) or supporting listing titles (barcode). */
  evidenceLabel: string;
  emptyText: string;
  extra?: string;
}

export function Candidates({ result, picked, onChoose, evidenceLabel, emptyText, extra }: Props) {
  return (
    <div className="candidates">
      {result.candidates.length === 0 ? (
        <div className="banner warn">{emptyText}</div>
      ) : (
        <>
          <p className="muted small">{result.candidates.length > 1 ? T.isThis : T.detected}</p>
          {result.candidates.map((c, i) => (
            <button key={i} type="button" className={`candidate ${picked === i ? 'on' : ''}`} onClick={() => onChoose(i)}>
              <span>
                <strong>{c.brand} {c.model}</strong>
                <span className="muted small">
                  {' '}
                  {[c.capacity, c.mount && T.mount(c.mount), c.colour, CATEGORY_NAME[c.category] ?? c.category].filter(Boolean).join(' · ')}
                </span>
              </span>
              <span className={`conf ${c.confidence >= 0.85 ? 'c-high' : c.confidence >= 0.6 ? 'c-medium' : 'c-low'}`}>
                {Math.round(c.confidence * 100)}%
              </span>
            </button>
          ))}
        </>
      )}
      {result.conditionGuess && (
        <p className="muted small">
          {T.guess(CONDITION_LABEL[result.conditionGuess], result.conditionNotes ?? null)}
        </p>
      )}
      {result.identifyingText.length > 0 && <p className="muted small">{evidenceLabel}: {result.identifyingText.join(' · ')}</p>}
      <p className="muted small">
        {extra ? `${extra} · ` : ''}
        {result.modelVersion} · {(result.latencyMs / 1000).toFixed(1)}s
        {result.costUsd !== undefined ? ` · ~$${result.costUsd.toFixed(4)}` : ''}
      </p>
    </div>
  );
}
