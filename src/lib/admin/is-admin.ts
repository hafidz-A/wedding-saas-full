import 'server-only'

/** True when `email` is in the ADMIN_EMAILS allowlist (comma-separated,
 *  case- + whitespace-insensitive). Empty/unset env ⇒ nobody is admin. */
export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false
  const allow = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  return allow.includes(email.trim().toLowerCase())
}
