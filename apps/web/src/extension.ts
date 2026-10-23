/** The FlipLens browser extension (apps/extension, ADR-032) on the Chrome Web Store. */
export const EXTENSION_URL = 'https://chromewebstore.google.com/detail/fliplens-resale-profit-ch/bikfmloehckpigadkaepnmakkaoklicp';

/** The extension marks the FlipLens page it runs on (apps/extension/src/app-session.ts). */
export const extensionInstalled = (): boolean => document.documentElement.dataset.fliplensExtension === '1';

/**
 * Chrome Web Store extensions install in desktop Chromium browsers: Chrome, Edge, Brave, Opera, Vivaldi.
 * Not on phones, not in Firefox or Safari.
 */
export function canInstallExtension(): boolean {
  const ua = navigator.userAgent;
  const mobile = (navigator as Navigator & { userAgentData?: { mobile?: boolean } }).userAgentData?.mobile ?? /Android|iPhone|iPad|Mobile/i.test(ua);
  return !mobile && /Chrome\/\d+/.test(ua) && !/Firefox|FxiOS|CriOS/.test(ua);
}
