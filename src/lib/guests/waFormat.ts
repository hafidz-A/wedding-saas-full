/**
 * WhatsApp text formatting for the guest invite message editor.
 *
 * WhatsApp has no rich text — it formats by markers: *bold*, _italic_,
 * ~strikethrough~, ```monospace```. The message is sent as plain text through
 * wa.me (encodeURIComponent leaves * _ ~ untouched), so the editor's B / I / S
 * buttons just insert/remove these markers, and the preview renders them the
 * way WhatsApp will.
 *
 * WhatsApp only honours a marker pair when:
 *   - the opening marker starts a word (start of text, or not after a letter/digit)
 *   - the closing marker ends a word (end of text, or not before a letter/digit)
 *   - there is no space right inside either marker (`* x*` is not bold)
 *   - both markers are on the same line
 * `toggleFormat` only ever produces pairs that satisfy those rules (it grows a
 * partial-word selection to the whole word, trims spaces, wraps line by line,
 * and treats {{nama}}-style placeholders as one word), and `parseWaFormatting`
 * applies the same rules when rendering, so the preview never lies.
 */

export type WaMarker = '*' | '_' | '~'

export interface TextSelection {
  value: string
  start: number
  end: number
}

const MARKER_CHARS = '*_~`'

// Placeholders ({{nama}}) and words (letters/digits, plus in-word ’ ' - so
// "do’a" or "diam-diam" stay whole) are the units a selection snaps to.
const TOKEN_RE = /\{\{\s*\w+\s*\}\}|[\p{L}\p{N}](?:[\p{L}\p{N}’'-]*[\p{L}\p{N}])?/gu
const ALNUM_RE = /[\p{L}\p{N}]/u

const isAlnum = (ch: string | undefined) => !!ch && ALNUM_RE.test(ch)
const isSpace = (ch: string | undefined) => !!ch && /\s/.test(ch)

function tokens(value: string): Array<[number, number]> {
  const out: Array<[number, number]> = []
  for (const m of value.matchAll(TOKEN_RE)) out.push([m.index!, m.index! + m[0].length])
  return out
}

/** Grow [start,end] so neither edge cuts through a word or placeholder. */
function snapToTokens(value: string, start: number, end: number): [number, number] {
  for (const [a, b] of tokens(value)) {
    if (a < start && start < b) start = a
    if (a < end && end < b) end = b
  }
  return [start, end]
}

/** If [s,e] is already wrapped in `m`, return the indices of the two markers. */
function findWrap(value: string, s: number, e: number, m: WaMarker): [number, number] | null {
  // Markers just outside the selection, possibly mixed with other markers
  // ("_*Ahmad*_" with "Ahmad" selected, toggling either one).
  let left = -1
  for (let i = s - 1; i >= 0 && MARKER_CHARS.includes(value[i]); i--) {
    if (value[i] === m) { left = i; break }
  }
  let right = -1
  for (let j = e; j < value.length && MARKER_CHARS.includes(value[j]); j++) {
    if (value[j] === m) { right = j; break }
  }
  return left >= 0 && right >= 0 ? [left, right] : null
}

/** Per-line ranges inside [start,end], trimmed of spaces and stray markers
 *  (so highlighting "*Ahmad*" acts on "Ahmad"); empty lines are skipped. */
function lineRanges(value: string, start: number, end: number): Array<[number, number]> {
  const out: Array<[number, number]> = []
  let lineStart = start
  for (let i = start; i <= end; i++) {
    if (i === end || value[i] === '\n') {
      let a = lineStart
      let b = i
      const trim = (ch: string) => isSpace(ch) || MARKER_CHARS.includes(ch)
      while (a < b && trim(value[a])) a++
      while (b > a && trim(value[b - 1])) b--
      if (b > a) out.push([a, b])
      lineStart = i + 1
    }
  }
  return out
}

/**
 * Toggle a WhatsApp format on the selection, like Word's B / I / S buttons.
 *   - Nothing selected, caret in or touching a word → formats that word.
 *   - Nothing selected otherwise → inserts `*placeholder*` with the
 *     placeholder selected, so typing replaces it.
 *   - Selection already formatted (every line) → removes the format.
 * Returns the new text and the selection to restore.
 */
export function toggleFormat(
  value: string,
  selStart: number,
  selEnd: number,
  marker: WaMarker,
  placeholder = 'teks',
): TextSelection {
  let start = Math.max(0, Math.min(selStart, selEnd, value.length))
  let end = Math.min(value.length, Math.max(selStart, selEnd))

  if (start === end) {
    const word = tokens(value).find(([a, b]) => a <= start && start <= b && (a < start || start < b))
    if (word) {
      ;[start, end] = word
    } else {
      // Caret not touching any word (a word next to the caret is caught
      // above), so the inserted pair always starts/ends a word.
      const insert = `${marker}${placeholder}${marker}`
      return {
        value: value.slice(0, start) + insert + value.slice(start),
        start: start + 1,
        end: start + 1 + placeholder.length,
      }
    }
  }

  ;[start, end] = snapToTokens(value, start, end)
  const ranges = lineRanges(value, start, end)
  if (ranges.length === 0) return { value, start: selStart, end: selEnd }

  const wraps = ranges.map(([a, b]) => findWrap(value, a, b, marker))
  const unwrap = wraps.every(Boolean)

  // Edit from the last line backwards so earlier indices stay valid.
  let next = value
  let newStart = ranges[0][0]
  let delta = 0
  for (let k = ranges.length - 1; k >= 0; k--) {
    const [a, b] = ranges[k]
    const w = wraps[k]
    if (unwrap && w) {
      const [l, r] = w
      next = next.slice(0, l) + next.slice(l + 1, r) + next.slice(r + 1)
      delta -= 2
      if (k === 0 && l < newStart) newStart = l
    } else if (!unwrap && !w) {
      next = next.slice(0, a) + marker + next.slice(a, b) + marker + next.slice(b)
      delta += 2
    }
  }

  if (ranges.length === 1) {
    // Single line: keep exactly the text selected (inside the markers).
    const [a, b] = ranges[0]
    // Removing the opening marker shifts the text left by one; adding one
    // shifts it right by one. Its length never changes.
    const shift = unwrap ? -1 : 1
    return { value: next, start: a + shift, end: b + shift }
  }
  const lastEnd = ranges[ranges.length - 1][1]
  return { value: next, start: newStart, end: Math.min(next.length, lastEnd + delta) }
}

/* ─────────────────────────── preview parsing ─────────────────────────── */

export type WaNode =
  | string
  | { type: 'bold' | 'italic' | 'strike'; children: WaNode[] }
  | { type: 'mono'; text: string }

const TYPE_OF: Record<string, 'bold' | 'italic' | 'strike'> = { '*': 'bold', _: 'italic', '~': 'strike' }

/** Parse WhatsApp markers into a tree, following WhatsApp's own rules. */
export function parseWaFormatting(text: string): WaNode[] {
  const out: WaNode[] = []
  let buf = ''
  const flush = () => {
    if (buf) out.push(buf)
    buf = ''
  }

  let i = 0
  while (i < text.length) {
    const ch = text[i]
    const opensHere = !isAlnum(text[i - 1])

    if (text.startsWith('```', i) && opensHere) {
      const close = text.indexOf('```', i + 3)
      if (close > i + 3) {
        flush()
        out.push({ type: 'mono', text: text.slice(i + 3, close) })
        i = close + 3
        continue
      }
    }

    if (ch in TYPE_OF && opensHere && text[i + 1] && !isSpace(text[i + 1]) && text[i + 1] !== ch) {
      let close = -1
      for (let j = i + 2; j < text.length; j++) {
        if (text[j] === '\n') break
        if (text[j] === ch && !isSpace(text[j - 1]) && !isAlnum(text[j + 1])) {
          close = j
          break
        }
      }
      if (close > 0) {
        flush()
        out.push({ type: TYPE_OF[ch], children: parseWaFormatting(text.slice(i + 1, close)) })
        i = close + 1
        continue
      }
    }

    buf += ch
    i++
  }
  flush()
  return out
}
