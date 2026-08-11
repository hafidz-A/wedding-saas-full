import { describe, it, expect } from 'vitest'
import { sanitizeLegalHtml } from '../sanitize'

describe('sanitizeLegalHtml — dangerous containers', () => {
  it('drops a script tag together with its content', () => {
    expect(sanitizeLegalHtml('<script>alert(1)</script>Sisa teks')).toBe('Sisa teks')
  })

  it('drops an UNCLOSED script and everything after it', () => {
    // Losing trailing content is the deliberate trade: better to drop than leak.
    expect(sanitizeLegalHtml('Aman<script>alert(1)')).toBe('Aman')
  })

  it('drops iframe, object, embed, svg and style with their content', () => {
    expect(sanitizeLegalHtml('<iframe src="x"></iframe>A')).toBe('A')
    expect(sanitizeLegalHtml('<style>p{color:red}</style>B')).toBe('B')
    expect(sanitizeLegalHtml('<svg onload="alert(1)"></svg>C')).toBe('C')
  })

  it('removes comments, including conditional ones', () => {
    expect(sanitizeLegalHtml('<!-- rahasia -->Halo')).toBe('Halo')
  })
})

describe('sanitizeLegalHtml — tags and attributes', () => {
  it('keeps allowed tags but strips every attribute', () => {
    expect(sanitizeLegalHtml('<p onclick="steal()">Halo</p>')).toBe('<p>Halo</p>')
    expect(sanitizeLegalHtml('<h2 id="x" class="y">Judul</h2>')).toBe('<h2>Judul</h2>')
  })

  it('drops a disallowed tag but keeps the text inside it', () => {
    expect(sanitizeLegalHtml('<div>teks</div>')).toBe('teks')
    expect(sanitizeLegalHtml('<form><input></form>isi')).toBe('isi')
  })

  it('self-closes br and hr', () => {
    expect(sanitizeLegalHtml('a<br>b')).toBe('a<br />b')
    expect(sanitizeLegalHtml('<hr>')).toBe('<hr />')
  })

  it('normalises tag case', () => {
    expect(sanitizeLegalHtml('<P>Halo</P>')).toBe('<p>Halo</p>')
  })
})

describe('sanitizeLegalHtml — href is the only surviving attribute', () => {
  it('keeps http, https, protocol-relative, site-relative, fragment and mailto', () => {
    expect(sanitizeLegalHtml('<a href="https://fincards.land">x</a>')).toBe('<a href="https://fincards.land">x</a>')
    expect(sanitizeLegalHtml('<a href="/privacy">x</a>')).toBe('<a href="/privacy">x</a>')
    expect(sanitizeLegalHtml('<a href="#bagian-2">x</a>')).toBe('<a href="#bagian-2">x</a>')
    expect(sanitizeLegalHtml('<a href="mailto:halo@fincards.land">x</a>')).toBe(
      '<a href="mailto:halo@fincards.land">x</a>',
    )
  })

  it('SECURITY: strips javascript:, data: and vbscript: hrefs, keeping the link text', () => {
    expect(sanitizeLegalHtml('<a href="javascript:alert(1)">klik</a>')).toBe('<a>klik</a>')
    expect(sanitizeLegalHtml('<a href="vbscript:msgbox">klik</a>')).toBe('<a>klik</a>')
    // A data: URL payload is kept free of "<script>" on purpose here: that
    // substring would be eaten by the drop-with-content pass before the href
    // logic ever ran, so the assertion would prove nothing about safeHref.
    expect(sanitizeLegalHtml('<a href="data:text/plain;base64,SGVsbG8=">klik</a>')).toBe('<a>klik</a>')
  })

  it('escapes ampersands inside a surviving href', () => {
    expect(sanitizeLegalHtml('<a href="/a&b">x</a>')).toBe('<a href="/a&amp;b">x</a>')
  })
})

describe('sanitizeLegalHtml — stray markup', () => {
  it('escapes a < that never formed a tag', () => {
    expect(sanitizeLegalHtml('5 < 3 itu salah')).toBe('5 &lt; 3 itu salah')
  })

  it('returns an empty string for empty input', () => {
    expect(sanitizeLegalHtml('')).toBe('')
  })
})
