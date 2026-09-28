/**
 * Operator details shown in the Privacy Policy and Terms. Fill these in before launch; while any value still
 * starts with "[", the legal pages show a DRAFT banner. Have both documents reviewed by a lawyer.
 */
export const LEGAL = {
  /** Legal name of the company or person running FlipLens. */
  operator: '[Company name]',
  address: '[Street and number, postcode, city, country]',
  /** Company register / VAT number, if any. */
  registration: '[Company register number, VAT ID]',
  email: '[privacy@your-domain.com]',
  /** Country whose law governs the Terms. */
  governingCountry: '[Country]',
  /** Date of the current version (YYYY-MM-DD). */
  effectiveDate: '2026-09-28',
} as const;

export const LEGAL_IS_DRAFT = Object.values(LEGAL).some((v) => v.startsWith('['));
