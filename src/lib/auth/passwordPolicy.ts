/**
 * Single source of truth for the account password policy (app side).
 *
 * A valid password must be at least MIN_PASSWORD_LENGTH characters AND contain
 * at least one uppercase letter, one digit, and one symbol (any non
 * alphanumeric character). Enforced on every UI entry point — /signup and
 * /reset-password — via {@link isPasswordValid}.
 *
 * NOTE: the same rules are mirrored for the Node scripts in
 * `scripts/lib/password-policy.mjs`. Keep the two in sync. For true
 * server-side enforcement (client checks can be bypassed) also enable the
 * matching requirements in Supabase Dashboard → Authentication → Passwords.
 */
export const MIN_PASSWORD_LENGTH = 8

export interface PasswordChecks {
  length: boolean
  upper: boolean
  number: boolean
  symbol: boolean
}

/** Per-rule pass/fail — drives the live checklist UI. */
export function checkPassword(password: string): PasswordChecks {
  return {
    length: password.length >= MIN_PASSWORD_LENGTH,
    upper: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
  }
}

/** True only when every rule passes. */
export function isPasswordValid(password: string): boolean {
  const c = checkPassword(password)
  return c.length && c.upper && c.number && c.symbol
}
