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

  it('signs ONLY the host, so the browser cannot 403 on a Content-Type mismatch', async () => {
    // aws4fetch keeps `content-type` in its UNSIGNABLE_HEADERS set, so the value
    // we hand it never enters the signature. This is load-bearing for the browser
    // upload: whatever Content-Type the PUT sends is recorded by R2 but not
    // verified against the signature, which removes the whole 403-on-mismatch
    // failure class. If a future signer change starts signing it, this test
    // fails first — and uploadFile.ts would then have to match it byte-for-byte.
    const { presignPut } = await import('../r2')
    const url = await presignPut('inv-1/123-foto.webp', 'image/webp', 300)
    expect(new URL(url).searchParams.get('X-Amz-SignedHeaders')).toBe('host')
    expect(url).not.toContain('content-type')
  })
})
