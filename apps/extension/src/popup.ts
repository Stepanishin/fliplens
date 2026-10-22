import { APP_URL, send, type Status } from './shared.js';

/** Toolbar popup: which account the extension checks as, checks left this month, and where it works. */

const de = navigator.language.startsWith('de');
const T = de
  ? {
      notConnected: 'Öffne FlipLens einmal in diesem Browser und melde dich an. Danach funktioniert die Erweiterung automatisch.',
      guest: 'Nicht angemeldet: du kannst eine Prüfung testen. Melde dich in FlipLens an für mehr.',
      checks: (used: number, limit: number) => `${used} von ${limit} Prüfungen diesen Monat`,
      where: 'Öffne ein Angebot auf Vinted, Kleinanzeigen, eBay, Subito, leboncoin, Wallapop, Marktplaats oder willhaben und klicke auf „Wiederverkauf prüfen“.',
      open: 'FlipLens öffnen',
      error: 'FlipLens ist gerade nicht erreichbar.',
    }
  : {
      notConnected: 'Open FlipLens once in this browser and sign in. The extension picks up your account automatically.',
      guest: 'Not signed in: you can try one check. Sign in at FlipLens for more.',
      checks: (used: number, limit: number) => `${used} of ${limit} checks this month`,
      where: 'Open a listing on Vinted, Kleinanzeigen, eBay, Subito, leboncoin, Wallapop, Marktplaats or willhaben and click "Check resale profit".',
      open: 'Open FlipLens',
      error: 'FlipLens cannot be reached right now.',
    };

const esc = (s: string): string => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const main = document.getElementById('main')!;

async function show(): Promise<void> {
  const r = await send<Status>({ type: 'status' });
  const open = `<a class="btn" href="${esc(APP_URL)}" target="_blank" rel="noopener">${esc(T.open)}</a>`;
  if (!r.ok) {
    main.innerHTML = `<p>${esc(T.error)}</p>${open}`;
    return;
  }
  const s = r.data;
  if (!s.connected) {
    main.innerHTML = `<p>${esc(T.notConnected)}</p>${open}`;
    return;
  }
  const who = s.account ? `<p><b>${esc(s.account.name ?? s.account.email ?? '')}</b>${s.account.name && s.account.email ? `<br><span class="muted">${esc(s.account.email)}</span>` : ''}</p>` : `<p>${esc(T.guest)}</p>`;
  const quota = s.quota
    ? `<div class="muted">${esc(T.checks(s.quota.used, s.quota.limit))}</div><div class="bar"><span style="width:${Math.min(100, Math.round((100 * s.quota.used) / Math.max(1, s.quota.limit)))}%"></span></div>`
    : '';
  main.innerHTML = `${who}${quota}<p class="muted">${esc(T.where)}</p>${open}`;
}

void show();
