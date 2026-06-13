import { describe, it, expect } from 'vitest'
import { safeExternalUrl } from '../safeUrl'

describe('safeExternalUrl', () => {
  it('passes through safe schemes', () => {
    expect(safeExternalUrl('https://wa.me/628123')).toBe('https://wa.me/628123')
    expect(safeExternalUrl('http://example.com')).toBe('http://example.com')
    expect(safeExternalUrl('mailto:a@b.com')).toBe('mailto:a@b.com')
    expect(safeExternalUrl('tel:+628123')).toBe('tel:+628123')
  })

  it('keeps relative + anchor targets', () => {
    expect(safeExternalUrl('#rsvp')).toBe('#rsvp')
    expect(safeExternalUrl('/lovebirds/budi')).toBe('/lovebirds/budi')
  })

  it('upgrades a scheme-less domain to https', () => {
    expect(safeExternalUrl('instagram.com/budi')).toBe('https://instagram.com/budi')
    expect(safeExternalUrl('wa.me/628123')).toBe('https://wa.me/628123')
  })

  it('blocks javascript/data/vbscript and obfuscated variants', () => {
    expect(safeExternalUrl('javascript:alert(1)')).toBe('#')
    expect(safeExternalUrl('JavaScript:alert(1)')).toBe('#')
    expect(safeExternalUrl('  javascript:alert(1)')).toBe('#')
    expect(safeExternalUrl('java\tscript:alert(1)')).toBe('#')
    expect(safeExternalUrl('data:text/html,<script>x</script>')).toBe('#')
    expect(safeExternalUrl('vbscript:msgbox(1)')).toBe('#')
  })

  it('handles non-strings and empties', () => {
    expect(safeExternalUrl(null)).toBe('#')
    expect(safeExternalUrl(undefined)).toBe('#')
    expect(safeExternalUrl(123)).toBe('#')
    expect(safeExternalUrl('')).toBe('#')
    expect(safeExternalUrl('   ')).toBe('#')
  })
})
