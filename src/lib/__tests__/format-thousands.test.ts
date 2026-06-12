import { describe, it, expect } from 'vitest'
import { formatThousands } from '../formatThousands.js'

describe('formatThousands', () => {
  it('groups digits with Indonesian dots', () => {
    expect(formatThousands('500000')).toBe('500.000')
    expect(formatThousands('1000000')).toBe('1.000.000')
    expect(formatThousands('1234567')).toBe('1.234.567')
  })

  it('leaves short numbers alone', () => {
    expect(formatThousands('999')).toBe('999')
    expect(formatThousands('0')).toBe('0')
  })

  it('re-formats already-formatted input (keystroke-safe)', () => {
    expect(formatThousands('500.000')).toBe('500.000')
    expect(formatThousands('500.0001')).toBe('5.000.001')
  })

  it('strips non-digits and leading zeros', () => {
    expect(formatThousands('Rp 1,500,000')).toBe('1.500.000')
    expect(formatThousands('007000')).toBe('7.000')
    expect(formatThousands('abc')).toBe('')
    expect(formatThousands('')).toBe('')
    expect(formatThousands(null)).toBe('')
    expect(formatThousands(undefined)).toBe('')
  })
})
