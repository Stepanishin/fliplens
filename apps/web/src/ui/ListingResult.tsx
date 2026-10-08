import { useState } from 'react';
import { track } from '../track.js';
import { eur } from './verdict.js';

export interface ListingOut {
  title: string;
  description: string;
  conditionText: string;
  keywords: string[];
  suggestedPriceMinor?: number | null;
  sellUrl: string;
}

async function copyText(text: string): Promise<void> {
  if (navigator.clipboard) return navigator.clipboard.writeText(text);
  // Older in-app browsers: no async clipboard API.
  const ta = document.createElement('textarea');
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  const ok = document.execCommand('copy');
  ta.remove();
  if (!ok) throw new Error('copy failed');
}

/** A written listing with copy buttons and a link to the marketplace's "sell" page. */
export function ListingResult({ listing, marketName, busy, onRegenerate }: { listing: ListingOut; marketName: string; busy: boolean; onRegenerate: () => void }) {
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(label: string, text: string) {
    try {
      await copyText(text);
      setCopied(label);
      track('listing_copied', { field: label });
      window.setTimeout(() => setCopied((c) => (c === label ? null : c)), 1500);
    } catch {
      setCopied(null);
    }
  }

  const field = (label: string, name: string, text: string, extra?: string, pre = false) => (
    <div className="listing-field">
      <div className="card-head">
        <strong>{label}</strong>
        <button type="button" className="link" onClick={() => void copy(name, text)}>{copied === name ? 'Copied' : 'Copy'}</button>
      </div>
      <p className={pre ? 'listing-desc' : undefined}>{text}</p>
      {extra && <span className="muted small">{extra}</span>}
    </div>
  );

  return (
    <div className="listing-out">
      {field('Title', 'title', listing.title, `${listing.title.length} characters`)}
      {field('Description', 'description', listing.description, undefined, true)}
      {field('Condition', 'condition', listing.conditionText)}
      {listing.suggestedPriceMinor != null && (
        <div className="maxbuy"><span>Suggested price</span><strong>{eur(listing.suggestedPriceMinor)}</strong></div>
      )}
      {listing.keywords.length > 0 && <p className="muted small">Keywords: {listing.keywords.join(', ')}</p>}
      <div className="sheet-actions">
        <button type="button" className="ghost" onClick={() => void copy('all', `${listing.title}\n\n${listing.description}`)}>{copied === 'all' ? 'Copied' : 'Copy title + text'}</button>
        <a className="primary" href={listing.sellUrl} target="_blank" rel="noreferrer">Open {marketName}</a>
      </div>
      <button type="button" className="link" disabled={busy} onClick={onRegenerate}>Write another version</button>
    </div>
  );
}
