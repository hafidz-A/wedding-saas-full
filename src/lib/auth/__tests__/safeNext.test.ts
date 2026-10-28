import { describe, it, expect } from 'vitest'
import { safeNext } from '../safeNext'

describe('safeNext — open-redirect guard', () => {
  it('returns same-origin paths unchanged', () => {
    expect(safeNext('/onboarding')).toBe('/onboarding')
    expect(safeNext('/onboarding?template=solary')).toBe('/onboarding?template=solary')
    expect(safeNext('/a/b/c#frag')).toBe('/a/b/c#frag')
  })

  it('rejects empty / missing values', () => {
    expect(safeNext(null)).toBeNull()
    expect(safeNext(undefined)).toBeNull()
    expect(safeNext('')).toBeNull()
  })

  it('rejects absolute external URLs (contains ://)', () => {
    expect(safeNext('https://evil.com')).toBeNull()
    expect(safeNext('http://evil.com/path')).toBeNull()
    expect(safeNext('/redirect?u=https://evil.com')).toBeNull()
  })

  it('rejects protocol-relative URLs (//host)', () => {
    expect(safeNext('//evil.com')).toBeNull()
  })

  it('rejects backslash bypass attempts', () => {
    expect(safeNext('/\\evil.com')).toBeNull()
    expect(safeNext('\\\\evil.com')).toBeNull()
  })

  it('rejects control characters the URL parser strips (tab/newline → //host)', () => {
    // Each of these resolves to https://evil.com/ in a browser: the WHATWG URL
    // parser deletes tab/CR/LF, turning "/\t/evil.com" into "//evil.com".
    expect(safeNext('/\t/evil.com')).toBeNull()
    expect(safeNext('/\n/evil.com')).toBeNull()
    expect(safeNext('/\r/evil.com')).toBeNull()
    // The query-string form: /login?next=/%09/evil.com
    expect(safeNext(new URLSearchParams('next=/%09/evil.com').get('next'))).toBeNull()
    // Any other control char is rejected too, even where it would be harmless.
    expect(safeNext('/onboarding\u0000')).toBeNull()
  })

  it('keeps percent-encoded control chars (they stay a same-origin path)', () => {
    expect(safeNext('/%09/evil.com')).toBe('/%09/evil.com')
  })

  it('rejects non-absolute paths (must start with /)', () => {
    expect(safeNext('onboarding')).toBeNull()
    expect(safeNext('javascript:alert(1)')).toBeNull()
  })

  it('rejects absurdly long values (> 500 chars)', () => {
    expect(safeNext('/' + 'a'.repeat(500))).toBeNull() // 501 chars total
    expect(safeNext('/' + 'a'.repeat(498))).toBe('/' + 'a'.repeat(498)) // 499 chars, ok
  })
})
