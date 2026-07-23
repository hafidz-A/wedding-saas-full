/**
 * Single source of truth for which nav controls appear next to the Fin•Cards
 * wordmark, per route. Landing shows none (you're already home). Entry / hub /
 * email-entry pages get Beranda only (Back would be redundant or dangling).
 * Mid-flow and dead-end pages get both. Kept as a pure function so the policy is
 * unit-testable and easy to adjust in one place.
 */
export function resolveNavChrome(pathname: string): { back: boolean; home: boolean } {
  if (pathname === '/') return { back: false, home: false }

  const homeOnly = new Set(['/login', '/onboarding', '/profile', '/verify-signup', '/reset-password'])
  if (homeOnly.has(pathname)) return { back: false, home: true }

  // Owner dashboard states (dynamic /[template]/[slug]/dashboard): back to profile + home.
  if (pathname.endsWith('/dashboard')) return { back: true, home: true }

  // /signup, /forgot-password, /terms, /privacy, /refund, 404, and any other
  // wordmark-bearing page: offer both.
  return { back: true, home: true }
}
