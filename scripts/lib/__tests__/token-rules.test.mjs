import { describe, it, expect } from 'vitest'
import { scanCss, scanTsx } from '../token-rules.mjs'

describe('scanCss', () => {
  it('flags raw 999px radius', () => {
    const out = scanCss('.x {\n  border-radius: 999px;\n}')
    expect(out).toHaveLength(1)
    expect(out[0].line).toBe(2)
  })
  it('allows token definition lines', () => {
    expect(scanCss(':root {\n  --radius-pill: 999px;\n}')).toHaveLength(0)
  })
  it('flags off-scale height on a button selector', () => {
    const out = scanCss('.saveBtn {\n  height: 40px;\n}')
    expect(out).toHaveLength(1)
  })
  it('allows 36/44/52 on a button selector', () => {
    expect(scanCss('.saveBtn {\n  height: 44px;\n}')).toHaveLength(0)
  })
})

describe('scanTsx', () => {
  it('flags numeric borderRadius: 999 in inline styles', () => {
    const out = scanTsx("const pill = { borderRadius: 999 }")
    expect(out).toHaveLength(1)
    expect(out[0].why).toContain('radius-pill')
  })
  it("allows borderRadius: 'var(--radius-pill)'", () => {
    expect(scanTsx("const pill = { borderRadius: 'var(--radius-pill)' }")).toHaveLength(0)
  })
  it('flags off-scale height inside a button-named style const', () => {
    const src = 'const saveBtn: React.CSSProperties = {\n  height: 40,\n}'
    const out = scanTsx(src)
    expect(out).toHaveLength(1)
    expect(out[0].line).toBe(2)
  })
  it('allows 36/44/52 heights in button-named consts', () => {
    expect(scanTsx('const saveBtn = {\n  height: 36,\n}')).toHaveLength(0)
  })
  it('ignores heights in non-control consts (layout sizing)', () => {
    expect(scanTsx('const thumb = {\n  height: 120,\n}')).toHaveLength(0)
  })
})
