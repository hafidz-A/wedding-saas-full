#!/usr/bin/env node
/**
 * Design-token drift guard (radius + control heights).
 *
 * After the 2026-06 token consolidation there is ONE radius scale
 * (--radius-* in src/styles/tokens.css, + Solary's aliased --r-*) and ONE
 * control-height scale (--ctl-h-sm 36 / --ctl-h 44 / --ctl-h-lg 52). This guard
 * keeps both clean. It does NOT police decorative graphics' bespoke sizes.
 *
 * Fails the build on:
 *   1. the dead `--border-radius-*` namespace (use --radius-*)
 *   2. a raw 999px in a border-radius rule (use --radius-pill / --r-pill)
 *   3. any single-value `border-radius: <N>px` literal (use a --radius-* token;
 *      clamp(), %, and multi-value decorative shapes are exempt)
 *   4. an off-scale height/width on a BUTTON selector (btn/button/cta/toggle/
 *      pill/seg/hamburger/burger) — must be 36/44/52 via --ctl-h*.
 *
 * Run: `npm run check:tokens`
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..')
const srcDir = join(root, 'src')

function cssFiles(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    const s = statSync(p)
    if (s.isDirectory()) out.push(...cssFiles(p))
    else if (name.endsWith('.css')) out.push(p)
  }
  return out
}

const CTL_OK = new Set(['36px', '44px', '52px'])
const BUTTON_SEL = /(btn|button|cta|toggle|pill|seg|hamburger|burger)/i
const offenses = []

for (const file of cssFiles(srcDir)) {
  const lines = readFileSync(file, 'utf8').split('\n')
  let currentSel = '' // last selector line opening a rule
  lines.forEach((line, i) => {
    const trimmed = line.trim()
    if (trimmed.includes('{')) currentSel = trimmed.replace(/\{.*$/, '').trim()

    // 1. dead legacy namespace (real use / definition, not comment prose)
    if (/var\(\s*--border-radius-/.test(line) || /^--border-radius-[\w-]*\s*:/.test(trimmed)) {
      offenses.push({ file, line: i + 1, text: trimmed, why: 'dead --border-radius-* namespace; use --radius-*' })
    }
    // 2. raw 999px in a border-radius rule (token defs `--radius-pill: 999px` exempt)
    if (/border-radius\s*:[^;]*\b999px\b/.test(line) && !trimmed.startsWith('--')) {
      offenses.push({ file, line: i + 1, text: trimmed, why: 'raw 999px; use var(--radius-pill) / --r-pill' })
    }
    // 3. single-value px radius literal (clamp / % / multi-value exempt)
    if (/border-radius\s*:\s*\d+px\s*;/.test(line) && !trimmed.startsWith('--')) {
      offenses.push({ file, line: i + 1, text: trimmed, why: 'off-scale radius literal; use a --radius-* token' })
    }
    // 4. off-scale height/width on a BUTTON selector. Match the keyword on the
    //    selector's LAST segment so a descendant (e.g. `.burger span` = the
    //    hamburger line) isn't mistaken for the button itself.
    const lastSeg = (currentSel.split(/\s+/).pop() || '')
    if (BUTTON_SEL.test(lastSeg)) {
      const m = line.match(/(?:min-)?(?:width|height)\s*:\s*(\d+px)\s*;/)
      if (m && !CTL_OK.has(m[1])) {
        offenses.push({ file, line: i + 1, text: `${currentSel} { … ${trimmed} }`, why: 'off-scale control size; use --ctl-h-sm/--ctl-h/--ctl-h-lg (36/44/52)' })
      }
    }
  })
}

if (offenses.length) {
  console.error(`\n✗ design-token drift — ${offenses.length} issue(s):\n`)
  for (const o of offenses) {
    console.error(`  ${relative(root, o.file)}:${o.line}`)
    console.error(`     ${o.text}`)
    console.error(`     → ${o.why}\n`)
  }
  process.exit(1)
}
console.log('✓ design tokens clean (radius scale + control heights)')
