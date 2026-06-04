/**
 * Mirror of src/lib/auth/passwordPolicy.ts for the Node scripts.
 * Keep the two in sync.
 *
 * Why a script-side check at all: scripts create accounts through
 * `supabase.auth.admin.createUser` with the service-role key, which BYPASSES
 * the Supabase Auth password policy. So this is the only thing stopping a
 * weak/non-compliant password from being set on a script-created account.
 */

export const MIN_PASSWORD_LENGTH = 8

export const PASSWORD_RULE_MESSAGE =
  'Password must be at least 8 characters and include an uppercase letter, a number, and a symbol.'

export function isPasswordValid(password) {
  return (
    typeof password === 'string' &&
    password.length >= MIN_PASSWORD_LENGTH &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  )
}

/** CLI convenience: print a clear error and exit(1) when the password fails. */
export function assertPasswordValid(password, label = 'password') {
  if (!isPasswordValid(password)) {
    console.error(`✗ Invalid ${label}: ${PASSWORD_RULE_MESSAGE}`)
    console.error(`  Received: ${JSON.stringify(password)}`)
    process.exit(1)
  }
}
