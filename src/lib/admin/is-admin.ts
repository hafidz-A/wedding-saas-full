import 'server-only'

import { createSupabaseServerClient } from '@/lib/supabase/server'

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

export class AdminAuthError extends Error {
  constructor(public reason: 'not-admin' | 'mfa-required') {
    super(reason)
    this.name = 'AdminAuthError'
  }
}

/** Require an MFA-verified (AAL2) allowlisted admin session. Throws
 *  AdminAuthError otherwise. Call at the top of every admin page + action. */
export async function requireAdmin(): Promise<{ email: string }> {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email || !isAdminEmail(user.email)) throw new AdminAuthError('not-admin')
  const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  if (data?.currentLevel !== 'aal2') throw new AdminAuthError('mfa-required')
  return { email: user.email }
}
