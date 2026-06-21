import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mutable mock for next/headers so each test controls what the request scope
// looks like (or whether headers() throws, simulating "no request scope").
let headerMock: { get: (k: string) => string | null } | (() => never)

vi.mock('next/headers', () => ({
  headers: () => {
    if (typeof headerMock === 'function') return (headerMock as () => never)()
    return headerMock
  },
}))

// server-only is a no-op marker module; stub it so the import doesn't blow up
// under vitest (it throws if imported into a client bundle).
vi.mock('server-only', () => ({}))

import { siteBaseUrl } from '../site-url'

function headersFrom(map: Record<string, string>) {
  return { get: (k: string) => map[k.toLowerCase()] ?? null }
}

describe('siteBaseUrl', () => {
  const orig = process.env.NEXT_PUBLIC_SITE_URL
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_SITE_URL
    headerMock = headersFrom({})
  })
  afterEach(() => {
    if (orig === undefined) delete process.env.NEXT_PUBLIC_SITE_URL
    else process.env.NEXT_PUBLIC_SITE_URL = orig
  })

  it('prefers NEXT_PUBLIC_SITE_URL and strips a trailing slash', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://fincards.net/'
    expect(siteBaseUrl()).toBe('https://fincards.net')
  })

  it('does not touch headers when the env var is set', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://fincards.net'
    headerMock = () => {
      throw new Error('headers() must not be called when env is set')
    }
    expect(siteBaseUrl()).toBe('https://fincards.net')
  })

  it('falls back to the forwarded request host when env is empty', () => {
    headerMock = headersFrom({
      'x-forwarded-host': 'my-app.vercel.app',
      'x-forwarded-proto': 'https',
    })
    expect(siteBaseUrl()).toBe('https://my-app.vercel.app')
  })

  it('uses the host header and defaults the protocol to https', () => {
    headerMock = headersFrom({ host: 'localhost:3000' })
    expect(siteBaseUrl()).toBe('https://localhost:3000')
  })

  it('returns "" (never a relative URL) when there is no env and no request scope', () => {
    headerMock = () => {
      throw new Error('called outside a request scope')
    }
    expect(siteBaseUrl()).toBe('')
  })
})
