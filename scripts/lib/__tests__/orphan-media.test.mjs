import { describe, it, expect } from 'vitest'
import { parseObjectsFromListXml, nextContinuationToken, partitionOrphans } from '../orphan-media.mjs'

const LIVE = 'aaaaaaaa-1111-2222-3333-444444444444'
const DEAD = 'bbbbbbbb-5555-6666-7777-888888888888'

const XML = `<?xml version="1.0"?><ListBucketResult>
  <Contents><Key>${LIVE}/1784-track1.mp3</Key><Size>1000</Size></Contents>
  <Contents><Key>${DEAD}/1785-foto.webp</Key><Size>2500</Size></Contents>
  <Contents><Key>smoke-test.txt</Key><Size>7</Size></Contents>
</ListBucketResult>`

describe('parseObjectsFromListXml', () => {
  it('reads every key and size', () => {
    expect(parseObjectsFromListXml(XML)).toEqual([
      { key: `${LIVE}/1784-track1.mp3`, size: 1000 },
      { key: `${DEAD}/1785-foto.webp`, size: 2500 },
      { key: 'smoke-test.txt', size: 7 },
    ])
  })

  it('returns an empty array for an empty listing', () => {
    expect(parseObjectsFromListXml('<?xml version="1.0"?><ListBucketResult></ListBucketResult>')).toEqual([])
  })
})

describe('nextContinuationToken', () => {
  it('returns the token when the listing is truncated', () => {
    const xml =
      '<ListBucketResult><IsTruncated>true</IsTruncated><NextContinuationToken>abc123</NextContinuationToken></ListBucketResult>'
    expect(nextContinuationToken(xml)).toBe('abc123')
  })

  it('returns null when the listing is complete', () => {
    expect(nextContinuationToken('<ListBucketResult><IsTruncated>false</IsTruncated></ListBucketResult>')).toBe(null)
    expect(nextContinuationToken('<ListBucketResult></ListBucketResult>')).toBe(null)
  })
})

describe('partitionOrphans', () => {
  const objects = parseObjectsFromListXml(XML)

  it('keeps folders whose invitation still exists and dooms the rest', () => {
    const { kept, doomed, doomedBytes } = partitionOrphans(objects, new Set([LIVE]))
    expect(kept).toEqual([`${LIVE}/1784-track1.mp3`])
    expect(doomed).toEqual([`${DEAD}/1785-foto.webp`])
    expect(doomedBytes).toBe(2500)
  })

  it('NEVER dooms a key at the bucket root — it has no invitation id to judge by', () => {
    const { kept, doomed } = partitionOrphans(objects, new Set())
    expect(doomed).not.toContain('smoke-test.txt')
    expect(kept).not.toContain('smoke-test.txt')
  })

  it('dooms everything when no invitations are live', () => {
    const { doomed, doomedBytes } = partitionOrphans(objects, new Set())
    expect(doomed).toEqual([`${LIVE}/1784-track1.mp3`, `${DEAD}/1785-foto.webp`])
    expect(doomedBytes).toBe(3500)
  })
})
