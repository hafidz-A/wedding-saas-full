import { describe, it, expect, afterEach, vi } from 'vitest'
import { readGuestName, readPreviewMode } from '../guestName.js'

function setSearch(search) {
  vi.stubGlobal('window', { location: { search } })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('readGuestName', () => {
  it('parses ?to= and decodes once', () => {
    setSearch('?to=Pak%20Ahmad')
    expect(readGuestName()).toBe('Pak Ahmad')
  })

  it('returns null when ?to= is absent', () => {
    setSearch('?preview=1')
    expect(readGuestName()).toBeNull()
  })

  it('returns null for an empty ?to=', () => {
    setSearch('?to=')
    expect(readGuestName()).toBeNull()
  })

  it('strips angle/brace characters', () => {
    setSearch('?to=' + encodeURIComponent('<b>Ahmad</b>{x}'))
    expect(readGuestName()).toBe('bAhmad/bx')
  })

  it('caps the name at 80 characters', () => {
    const long = 'A'.repeat(200)
    setSearch('?to=' + long)
    expect(readGuestName()).toHaveLength(80)
  })

  it('returns null during SSR (no window)', () => {
    vi.stubGlobal('window', undefined)
    expect(readGuestName()).toBeNull()
  })
})

describe('readPreviewMode', () => {
  it('is true only for preview=1', () => {
    setSearch('?preview=1')
    expect(readPreviewMode()).toBe(true)
    setSearch('?preview=0')
    expect(readPreviewMode()).toBe(false)
    setSearch('')
    expect(readPreviewMode()).toBe(false)
  })
})
