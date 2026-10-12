import { describe, it, expect } from 'vitest'
import { splitPoints } from '../splitPoints.js'

describe('splitPoints', () => {
  it('splits inline bullets', () => {
    expect(splitPoints('• Kedatangan keluarga • Pembukaan oleh MC • Ijab qabul'))
      .toEqual(['Kedatangan keluarga', 'Pembukaan oleh MC', 'Ijab qabul'])
  })

  it('splits lines and drops blanks', () => {
    expect(splitPoints('Satu\r\n\n  Dua  \nTiga')).toEqual(['Satu', 'Dua', 'Tiga'])
  })

  it('keeps plain text as one point', () => {
    expect(splitPoints('Welcome drinks and live acoustic music.')).toEqual(['Welcome drinks and live acoustic music.'])
  })

  it('handles empty / non-string', () => {
    expect(splitPoints('')).toEqual([])
    expect(splitPoints(undefined)).toEqual([])
  })
})
