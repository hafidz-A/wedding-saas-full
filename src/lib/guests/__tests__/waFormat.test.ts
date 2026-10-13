import { describe, it, expect } from 'vitest'
import { toggleFormat, parseWaFormatting, stripWaFormatting } from '../waFormat'

/** Select `needle` (first occurrence) in `text` and toggle. */
function sel(text: string, needle: string, m: '*' | '_' | '~' = '*') {
  const i = text.indexOf(needle)
  if (i < 0) throw new Error(`"${needle}" not in "${text}"`)
  return toggleFormat(text, i, i + needle.length, m)
}
const picked = (r: { value: string; start: number; end: number }) => r.value.slice(r.start, r.end)

describe('toggleFormat — wrapping', () => {
  it('bolds a selected placeholder', () => {
    const r = sel('Halo {{nama}},', '{{nama}}')
    expect(r.value).toBe('Halo *{{nama}}*,')
    expect(picked(r)).toBe('{{nama}}')
  })

  it('never splits a placeholder (selecting only "nama")', () => {
    expect(sel('Halo {{nama}},', 'nama').value).toBe('Halo *{{nama}}*,')
  })

  it('grows a partial-word selection to the whole word (WhatsApp ignores mid-word markers)', () => {
    expect(sel('Halo Ahmad,', 'hma').value).toBe('Halo *Ahmad*,')
  })

  it('keeps in-word apostrophes and hyphens whole', () => {
    expect(sel('setiap do’a kami', 'do').value).toBe('setiap *do’a* kami')
    expect(sel('diam-diam saja', 'diam').value).toBe('*diam-diam* saja')
  })

  it('trims spaces out of the markers ("* x*" would not render)', () => {
    expect(sel('Halo  Ahmad  ya', '  Ahmad  ').value).toBe('Halo  *Ahmad*  ya')
  })

  it('wraps each line separately (markers must be on one line)', () => {
    const text = 'Baris satu\nBaris dua'
    const r = toggleFormat(text, 0, text.length, '*')
    expect(r.value).toBe('*Baris satu*\n*Baris dua*')
  })

  it('skips blank lines in a multi-line selection', () => {
    const text = 'A\n\nB'
    expect(toggleFormat(text, 0, text.length, '_').value).toBe('_A_\n\n_B_')
  })

  it('italic and strike use their own markers', () => {
    expect(sel('Halo Ahmad', 'Ahmad', '_').value).toBe('Halo _Ahmad_')
    expect(sel('Halo Ahmad', 'Ahmad', '~').value).toBe('Halo ~Ahmad~')
  })

  it('stacks formats (bold then italic)', () => {
    const r1 = sel('Halo Ahmad', 'Ahmad', '*')
    const r2 = toggleFormat(r1.value, r1.start, r1.end, '_')
    expect(r2.value).toBe('Halo *_Ahmad_*')
    expect(picked(r2)).toBe('Ahmad')
  })
})

describe('toggleFormat — unwrapping', () => {
  it('removes bold when the text is selected without its markers', () => {
    const r = sel('Halo *Ahmad*,', 'Ahmad')
    expect(r.value).toBe('Halo Ahmad,')
    expect(picked(r)).toBe('Ahmad')
  })

  it('removes bold when the markers are selected too', () => {
    expect(sel('Halo *Ahmad*,', '*Ahmad*').value).toBe('Halo Ahmad,')
  })

  it('pressing twice restores the original text and selection', () => {
    const text = 'Halo {{nama}}, apa kabar'
    const i = text.indexOf('{{nama}}')
    const once = toggleFormat(text, i, i + 8, '*')
    const twice = toggleFormat(once.value, once.start, once.end, '*')
    expect(twice.value).toBe(text)
    expect(picked(twice)).toBe('{{nama}}')
  })

  it('removes only the requested format from stacked formats', () => {
    expect(sel('Halo *_Ahmad_*', 'Ahmad', '*').value).toBe('Halo _Ahmad_')
    expect(sel('Halo *_Ahmad_*', 'Ahmad', '_').value).toBe('Halo *Ahmad*')
  })

  it('multi-line: unwraps when every line is formatted, otherwise formats the rest', () => {
    const all = '*A*\n*B*'
    expect(toggleFormat(all, 0, all.length, '*').value).toBe('A\nB')
    const mixed = '*A*\nB'
    expect(toggleFormat(mixed, 0, mixed.length, '*').value).toBe('*A*\n*B*')
  })
})

describe('toggleFormat — no selection', () => {
  it('caret inside a word formats that word', () => {
    const text = 'Halo Ahmad'
    expect(toggleFormat(text, 7, 7, '*').value).toBe('Halo *Ahmad*')
  })

  it('caret on empty space inserts a selected placeholder', () => {
    const r = toggleFormat('Halo ', 5, 5, '*', 'teks')
    expect(r.value).toBe('Halo *teks*')
    expect(picked(r)).toBe('teks')
  })

  it('caret right after a word formats that word (like Word)', () => {
    expect(toggleFormat('Halo Ahmad', 10, 10, '*').value).toBe('Halo *Ahmad*')
    expect(toggleFormat('Halo {{nama}},', 13, 13, '*').value).toBe('Halo *{{nama}}*,')
  })

  it('empty text inserts the placeholder', () => {
    expect(toggleFormat('', 0, 0, '_', 'teks').value).toBe('_teks_')
  })

  it('whitespace-only selection changes nothing', () => {
    expect(toggleFormat('a   b', 1, 4, '*').value).toBe('a   b')
  })
})

describe('parseWaFormatting', () => {
  it('parses bold, italic, strike, mono', () => {
    expect(parseWaFormatting('Halo *Ahmad*!')).toEqual(['Halo ', { type: 'bold', children: ['Ahmad'] }, '!'])
    expect(parseWaFormatting('_a_ ~b~ ```c```')).toEqual([
      { type: 'italic', children: ['a'] },
      ' ',
      { type: 'strike', children: ['b'] },
      ' ',
      { type: 'mono', text: 'c' },
    ])
  })

  it('parses nested formats', () => {
    expect(parseWaFormatting('*_x_*')).toEqual([{ type: 'bold', children: [{ type: 'italic', children: ['x'] }] }])
  })

  it('ignores markers WhatsApp would ignore', () => {
    expect(parseWaFormatting('* a*')).toEqual(['* a*'])
    expect(parseWaFormatting('a*b*c')).toEqual(['a*b*c'])
    expect(parseWaFormatting('*a\nb*')).toEqual(['*a\nb*'])
    expect(parseWaFormatting('5 * 3 = 15')).toEqual(['5 * 3 = 15'])
    expect(parseWaFormatting('**')).toEqual(['**'])
  })

  it('leaves underscores inside URLs alone', () => {
    const url = 'https://fincards.land/lovebirds/adi_rani?to=Ahmad_Budi'
    expect(parseWaFormatting(url)).toEqual([url])
  })

  it('round-trips with toggleFormat output', () => {
    const r = sel('Halo {{nama}}, sampai jumpa', '{{nama}}')
    const nodes = parseWaFormatting(r.value.replace('{{nama}}', 'Ahmad Budi'))
    expect(nodes).toEqual(['Halo ', { type: 'bold', children: ['Ahmad Budi'] }, ', sampai jumpa'])
  })
})

describe('stripWaFormatting', () => {
  it('drops honoured markers, keeps the text', () => {
    expect(stripWaFormatting('Halo *_Ahmad_*, ~lama~ ```kode```')).toBe('Halo Ahmad, lama kode')
  })

  it('keeps markers WhatsApp would ignore and URLs untouched', () => {
    const s = '5 * 3 = 15\nhttps://fincards.land/lovebirds/adi_rani?to=Ahmad_Budi'
    expect(stripWaFormatting(s)).toBe(s)
  })

  it('multi-line message', () => {
    expect(stripWaFormatting('*Halo Ahmad*,\n\nKode: *123456*')).toBe('Halo Ahmad,\n\nKode: 123456')
  })
})
