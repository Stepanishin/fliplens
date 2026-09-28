import type { IdentificationResult } from './api.js';
import { CONDITION_LABEL } from './format.js';

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
          <p className="muted small">{result.candidates.length > 1 ? 'Is this:' : 'Detected:'}</p>
          {result.candidates.map((c, i) => (
            <button key={i} type="button" className={`candidate ${picked === i ? 'on' : ''}`} onClick={() => onChoose(i)}>
              <span>
                <strong>{c.brand} {c.model}</strong>
                <span className="muted small">
                  {' '}
                  {[c.capacity, c.mount && `${c.mount} mount`, c.colour, c.category.replace(/_/g, ' ')].filter(Boolean).join(' · ')}
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
          Condition guess: {CONDITION_LABEL[result.conditionGuess]}
          {result.conditionNotes ? ` (${result.conditionNotes})` : ''}. Please confirm below.
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
