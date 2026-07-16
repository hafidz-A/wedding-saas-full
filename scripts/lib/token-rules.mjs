const CTL_OK = new Set(['36px', '44px', '52px'])
const CTL_OK_NUM = new Set(['36', '44', '52'])
const BUTTON_SEL = /(btn|button|cta|toggle|pill|seg|hamburger|burger)/i
const BUTTON_CONST = /(btn|button|cta|input|ctl)/i

/** CSS rules (unchanged from the original inline implementation). */
export function scanCss(source) {
  const offenses = []
  const lines = source.split('\n')
  let currentSel = ''
  lines.forEach((line, i) => {
    const trimmed = line.trim()
    if (trimmed.includes('{')) currentSel = trimmed.replace(/\{.*$/, '').trim()

    if (/var\(\s*--border-radius-/.test(line) || /^--border-radius-[\w-]*\s*:/.test(trimmed)) {
      offenses.push({ line: i + 1, text: trimmed, why: 'dead --border-radius-* namespace; use --radius-*' })
    }
    if (/border-radius\s*:[^;]*\b999px\b/.test(line) && !trimmed.startsWith('--')) {
      offenses.push({ line: i + 1, text: trimmed, why: 'raw 999px; use var(--radius-pill) / --r-pill' })
    } else if (/border-radius\s*:\s*\d+px\s*;/.test(line) && !trimmed.startsWith('--')) {
      offenses.push({ line: i + 1, text: trimmed, why: 'off-scale radius literal; use a --radius-* token' })
    }
    const lastSeg = currentSel.split(/\s+/).pop() || ''
    if (BUTTON_SEL.test(lastSeg)) {
      const m = line.match(/(?:min-)?(?:width|height)\s*:\s*(\d+px)\s*;/)
      if (m && !CTL_OK.has(m[1])) {
        offenses.push({
          line: i + 1,
          text: `${currentSel} { … ${trimmed} }`,
          why: 'off-scale control size; use --ctl-h-sm/--ctl-h/--ctl-h-lg (36/44/52)',
        })
      }
    }
  })
  return offenses
}

/**
 * Inline-style rules for .tsx/.jsx/.ts — the blind spot that let the admin console
 * drift: React.CSSProperties objects are invisible to the CSS scan.
 * 1. `borderRadius: 999` (numeric) OR `borderRadius: '999px'` / `"999px"` (quoted
 *    string) → use 'var(--radius-pill)'
 * 2. off-scale `height:`/`minHeight:` inside a style const whose NAME looks
 *    like a control (btn/button/cta/input/ctl) → 36/44/52 only.
 */
export function scanTsx(source) {
  const offenses = []
  const lines = source.split('\n')
  let currentConst = ''
  lines.forEach((line, i) => {
    const decl = line.match(/(?:const|let)\s+(\w+)\s*(?::\s*React\.CSSProperties)?\s*=\s*\{/)
    if (decl) currentConst = decl[1]

    if (/\bborderRadius:\s*(?:999\b|['"]999px['"])/.test(line)) {
      offenses.push({ line: i + 1, text: line.trim(), why: "raw 999 radius; use 'var(--radius-pill)'" })
    }
    if (BUTTON_CONST.test(currentConst)) {
      const m = line.match(/\b(?:height|minHeight):\s*(\d+)\s*[,}\s]/)
      if (m && !CTL_OK_NUM.has(m[1])) {
        offenses.push({
          line: i + 1,
          text: `${currentConst} { … ${line.trim()} }`,
          why: 'off-scale control size in inline style; use 36/44/52 (--ctl-h scale)',
        })
      }
    }
  })
  return offenses
}
