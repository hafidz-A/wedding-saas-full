import { describe, it, expect } from 'vitest'
import nextConfig from '../../next.config.js'

/**
 * Guards the caching contract for committed assets under public/.
 *
 * Next's default for that directory is `max-age=0, must-revalidate`, which makes
 * every returning guest re-validate every image. On this project Edge Requests
 * run out roughly three times sooner than transfer bytes, so those revalidations
 * — not the bytes — are what actually consumes the hosting quota.
 */
describe('static asset cache headers', () => {
  async function headersFor(path: string): Promise<Record<string, string>> {
    const rules = await nextConfig.headers()
    const out: Record<string, string> = {}
    for (const rule of rules) {
      const prefix = rule.source.replace('/:path*', '')
      if (prefix === '' || path.startsWith(`${prefix}/`)) {
        for (const h of rule.headers) out[h.key] = h.value
      }
    }
    return out
  }

  for (const path of [
    '/templates/lovebirds/demo/coupleGate.webp',
    '/tutorial/solary/editor-list.webp',
    '/images/couple_silhouette.webp',
    '/images/brand/fincards-logo-email.png',
  ]) {
    it(`caches ${path} for 30 days`, async () => {
      const cc = (await headersFor(path))['Cache-Control']
      expect(cc).toContain('max-age=2592000')
      expect(cc).toContain('stale-while-revalidate')
    })
  }

  it('does NOT mark them immutable — the filenames are not content-hashed', async () => {
    const cc = (await headersFor('/templates/lovebirds/demo/coupleGate.webp'))['Cache-Control']
    expect(cc).not.toContain('immutable')
  })

  it('still applies the baseline security headers to those paths', async () => {
    const h = await headersFor('/images/couple_silhouette.webp')
    expect(h['X-Content-Type-Options']).toBe('nosniff')
    expect(h['Strict-Transport-Security']).toContain('max-age=')
  })
})
