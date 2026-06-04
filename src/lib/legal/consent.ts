/**
 * Single source for the legal-consent version recorded at signup.
 *
 * Bump this date string whenever the Privacy Policy or Refund Policy text
 * changes in a way that requires fresh consent. The value is stamped into
 * each new user's `auth.users.raw_user_meta_data` (see SignupForm) so we can
 * later tell which version of the policies a given account agreed to.
 */
export const CONSENT_VERSION = '2026-06-04'
