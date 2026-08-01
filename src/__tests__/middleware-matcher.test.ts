import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'
import { config } from '../middleware'

// Next's compiled path-to-regexp is CJS; createRequire loads it deterministically
// under vitest's ESM runner without an interop guess.
const require = createRequire(import.meta.url)
const { pathToRegexp } = require('next/dist/compiled/path-to-regexp')

/**
 * Compile config.matcher the way Next.js does at build time.
 *
 * getMiddlewareMatchers() (next/dist/build/analysis/get-page-static-info.js)
 * appends `(.json)?` to every matcher source so `/_next/data/<buildid>/x.json`
 * prefetches still hit middleware. That suffix is the whole reason this test
 * exists: a matcher ending in a BARE `:param` gets it absorbed into the param's
 * own match pattern (`{name:'slug', pattern:'.json', modifier:'?'}`), silently
 * making that segment optional and matching nearly the entire site. Reading the
 * matcher on paper does not reveal this — it has to be compiled.
 */
function matches(pathname: string): boolean {
  return config.matcher.some((source) => pathToRegexp(`${source}(.json)?`).test(pathname))
}

describe('middleware config.matcher', () => {
  // Routes that MUST run middleware: they depend on Supabase session refresh
  // (the server client's cookie writer no-ops inside a Server Component) or on
  // the idle-timeout cookie slide, which lives only in middleware.
  it.each([
    '/profile',
    '/onboarding',
    '/admin',
    '/admin/invitations',
    '/admin/invitations/new',
    '/lovebirds/adi-rani',
    '/solary/demo-solary',
    '/lovebirds/adi-rani/dashboard',
    '/lovebirds/adi-rani/dashboard/guests',
  ])('runs middleware on %s', (p) => {
    expect(matches(p)).toBe(true)
  })

  // Routes that must NOT run middleware: no user session is consulted, so an
  // execution here is pure cost (and, for a signed-in visitor, a wasted
  // Supabase round-trip before the CDN cache).
  it.each([
    '/',
    '/login',
    '/signup',
    '/verify-signup',
    '/forgot-password',
    '/reset-password',
    '/terms',
    '/privacy',
    '/refund',
    '/lovebirds/demo-lovebirds/icon',
    '/solary/demo-solary/checkin',
    '/robots.txt',
    '/sitemap.xml',
    '/icon.png',
    '/favicon.ico',
    '/api/rsvp',
    '/_next/static/chunks/main.js',
    '/lovebirds',
  ])('does not run middleware on %s', (p) => {
    expect(matches(p)).toBe(false)
  })

  // Every real file under public/ is a static asset. None of them need a
  // session; the old folder-name exclusion list missed 83 of 88 of them.
  it.each([
    '/images/fincards-logo.png',
    '/templates/lovebirds/demo/hero.jpg',
    '/solary/textures/earth.webp',
    '/tutorial/lovebirds/step-1.png',
  ])('does not run middleware on public asset %s', (p) => {
    expect(matches(p)).toBe(false)
  })

  it('never ends an entry in a bare :param, which Next\'s (.json)? suffix would hijack', () => {
    for (const source of config.matcher) {
      expect(source).not.toMatch(/:[A-Za-z_][A-Za-z0-9_]*$/)
    }
  })
})
