import { describe, it, expect, beforeEach, vi } from 'vitest'

beforeEach(() => {
  vi.resetModules()
  process.env.R2_ACCOUNT_ID = 'acc123'
  process.env.R2_BUCKET = 'invitation-media'
  process.env.R2_ACCESS_KEY_ID = 'ak'
  // Long and distinctive on purpose: the "secret must not leak into the URL"
  // assertion below would be flaky against a short value, since a 2-char string
  // can appear by chance inside a base64 signature.
  process.env.R2_SECRET_ACCESS_KEY = 'do-not-leak-this-secret-value'
  process.env.R2_PUBLIC_HOST = 'https://media.fincards.land'
})

describe('publicUrl', () => {
  it('builds a URL on the configured public host', async () => {
    const { publicUrl } = await import('../r2')
    expect(publicUrl('inv-1/123-foto.webp')).toBe('https://media.fincards.land/inv-1/123-foto.webp')
  })

  it('does not double the slash when the host has a trailing one', async () => {
    process.env.R2_PUBLIC_HOST = 'https://media.fincards.land/'
    const { publicUrl } = await import('../r2')
    expect(publicUrl('inv-1/a.webp')).toBe('https://media.fincards.land/inv-1/a.webp')
  })
})

describe('parseSizesFromListXml', () => {
  it('sums every Size element', async () => {
    const { parseSizesFromListXml } = await import('../r2')
    const xml = `<?xml version="1.0"?><ListBucketResult>
      <Contents><Key>inv-1/a.webp</Key><Size>1000</Size></Contents>
      <Contents><Key>inv-1/b.mp3</Key><Size>2500</Size></Contents>
    </ListBucketResult>`
    expect(parseSizesFromListXml(xml)).toBe(3500)
  })

  it('returns 0 for an empty listing', async () => {
    const { parseSizesFromListXml } = await import('../r2')
    expect(parseSizesFromListXml('<?xml version="1.0"?><ListBucketResult></ListBucketResult>')).toBe(0)
  })
})

describe('parseKeysFromListXml', () => {
  it('reads every key in the listing', async () => {
    const { parseKeysFromListXml } = await import('../r2')
    const xml = `<?xml version="1.0"?><ListBucketResult>
      <Contents><Key>inv-1/a.webp</Key><Size>1000</Size></Contents>
      <Contents><Key>inv-1/b.mp3</Key><Size>2500</Size></Contents>
    </ListBucketResult>`
    expect(parseKeysFromListXml(xml)).toEqual(['inv-1/a.webp', 'inv-1/b.mp3'])
  })

  it('returns an empty array for an empty listing', async () => {
    const { parseKeysFromListXml } = await import('../r2')
    expect(parseKeysFromListXml('<?xml version="1.0"?><ListBucketResult></ListBucketResult>')).toEqual([])
  })
})

describe('presignPut', () => {
  it('produces a signed query URL for the right bucket and key, with an expiry', async () => {
    const { presignPut } = await import('../r2')
    const url = await presignPut('inv-1/123-foto.webp', 'image/webp', 300)
    expect(url).toContain('https://acc123.r2.cloudflarestorage.com/invitation-media/inv-1/123-foto.webp')
    expect(url).toContain('X-Amz-Expires=300')
    expect(url).toContain('X-Amz-Signature=')
    // The secret itself must never appear in the URL.
    expect(url).not.toContain('do-not-leak-this-secret-value')
  })

  it('signs content-type + host — and nothing the browser adds itself', async () => {
    // Signing content-type is the security boundary: R2 serves whatever type the
    // PUT carried, so an unsigned type let any account store text/html on the
    // public media host. Only content-type and host may be signed: the browser
    // sets content-length / user-agent itself, and signing those would 403
    // every upload. uploadFile.ts must PUT the exact contentType it sent /sign.
    const { presignPut } = await import('../r2')
    const url = await presignPut('inv-1/123-foto.webp', 'image/webp', 300)
    expect(new URL(url).searchParams.get('X-Amz-SignedHeaders')).toBe('content-type;host')
  })

  it('binds the signature to the declared type (a different type gets a different signature)', async () => {
    const { presignPut } = await import('../r2')
    const now = new Date('2026-10-28T00:00:00Z')
    vi.useFakeTimers({ now })
    try {
      const webp = new URL(await presignPut('inv-1/x', 'image/webp', 300)).searchParams.get('X-Amz-Signature')
      const html = new URL(await presignPut('inv-1/x', 'text/html', 300)).searchParams.get('X-Amz-Signature')
      expect(webp).not.toBe(html)
    } finally {
      vi.useRealTimers()
    }
  })
})
