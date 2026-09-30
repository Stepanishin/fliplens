/**
 * Operator details shown in the Privacy Policy and Terms. Fill these in before launch; while any value still
 * starts with "[", the legal pages show a DRAFT banner. Have both documents reviewed by a lawyer.
 */
export const LEGAL = {
  /** Legal name of the company or person running FlipLens. */
  operator: 'Evgenii Stepanishin',
  /** Postal address; empty to leave it out (add it once FlipLens is run as a registered business). */
  address: '',
  /** Business register / VAT number; empty while there is none. */
  registration: '',
  /** Data protection requests (Privacy Policy). */
  email: 'privacy@fliplens.eu',
  /** Everything else: account, billing, withdrawal (Terms). */
  supportEmail: 'support@fliplens.eu',
  /** Country whose law governs the Terms. */
  governingCountry: 'Slovenia',
  /** Date of the current version (YYYY-MM-DD). */
  effectiveDate: '2026-09-28',
} as const;

export const LEGAL_IS_DRAFT = Object.values(LEGAL).some((v) => v.startsWith('['));
