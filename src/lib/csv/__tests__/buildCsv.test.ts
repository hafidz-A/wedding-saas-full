import { describe, it, expect } from 'vitest'
import { csvEscapeCell, buildCsv } from '../buildCsv'

describe('csvEscapeCell', () => {
  it('passes plain text through unchanged', () => {
    expect(csvEscapeCell('Budi')).toBe('Budi')
  })
  it('returns empty string for null/undefined', () => {
    expect(csvEscapeCell(null)).toBe('')
    expect(csvEscapeCell(undefined)).toBe('')
  })
  it('quotes cells containing comma, quote, or newline', () => {
    expect(csvEscapeCell('a,b')).toBe('"a,b"')
    expect(csvEscapeCell('he said "hi"')).toBe('"he said ""hi"""')
  })
  it('neutralises formula-injection prefixes with a leading quote', () => {
    expect(csvEscapeCell('=1+2')).toBe("'=1+2")
    expect(csvEscapeCell('+49')).toBe("'+49")
    expect(csvEscapeCell('-5')).toBe("'-5")
    expect(csvEscapeCell('@x')).toBe("'@x")
  })
  it('neutralises then quotes when both apply', () => {
    expect(csvEscapeCell('=cmd,x')).toBe(`"'=cmd,x"`)
  })
})

describe('buildCsv', () => {
  it('returns empty string for no rows', () => {
    expect(buildCsv([])).toBe('')
  })
  it('builds a header line from the first row keys + data lines', () => {
    const out = buildCsv([{ Nama: 'Budi', Jumlah: 2 }, { Nama: 'Ani', Jumlah: 1 }])
    expect(out).toBe('Nama,Jumlah\nBudi,2\nAni,1')
  })
})
