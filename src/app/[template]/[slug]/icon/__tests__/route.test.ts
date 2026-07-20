import { describe, it, expect } from 'vitest'
import { GET } from '../route'

describe('GET /[template]/[slug]/icon', () => {
  it('returns the brand PNG with a 200 and image/png content type', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('image/png')
  })
})
