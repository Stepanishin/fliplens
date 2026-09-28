/** GTIN-8/12/13/14 helpers (EAN, UPC). */

/** Digits only, valid length and check digit, else undefined. */
export function normalizeGtin(input: string): string | undefined {
  const d = input.replace(/\D/g, '');
  if (![8, 12, 13, 14].includes(d.length)) return undefined;
  return checkDigit(d.slice(0, -1)) === Number(d.at(-1)) ? d : undefined;
}

function checkDigit(body: string): number {
  let sum = 0;
  for (let i = 0; i < body.length; i++) {
    const n = Number(body[body.length - 1 - i]);
    sum += i % 2 === 0 ? n * 3 : n;
  }
  return (10 - (sum % 10)) % 10;
}

/** The same code as UPC-12 and EAN-13: marketplaces store it either way. */
export function gtinSearchVariants(gtin: string): string[] {
  const out = new Set([gtin]);
  if (gtin.length === 12) out.add(`0${gtin}`);
  if (gtin.length === 13 && gtin.startsWith('0')) out.add(gtin.slice(1));
  if (gtin.length === 14 && gtin.startsWith('0')) out.add(gtin.slice(1));
  return [...out];
}
