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
 * Also scans `.tsx`/`.jsx`/`.ts` inline `React.CSSProperties` objects for the
 * same drift (`borderRadius: 999` numeric OR quoted `'999px'`/`"999px"`, and
 * off-scale heights in button-named style consts) — the blind spot that let
 * the admin console drift silently. `.d.ts`, `__tests__/`, and `scripts/`
 * (outside `src/`) are excluded from the walk.
 *
 * Run: `npm run check:tokens`
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { scanCss, scanTsx } from './lib/token-rules.mjs'

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..')
const srcDir = join(root, 'src')

function walk(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (name === '__tests__') continue
    const s = statSync(p)
    if (s.isDirectory()) out.push(...walk(p))
    else if (name.endsWith('.d.ts')) continue
    else if (/\.(css|tsx|jsx|ts)$/.test(name)) out.push(p)
  }
  return out
}

const offenses = []
for (const file of walk(srcDir)) {
  const src = readFileSync(file, 'utf8')
  const found = file.endsWith('.css') ? scanCss(src) : scanTsx(src)
  for (const o of found) offenses.push({ ...o, file })
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
console.log('✓ design tokens clean (radius + control heights, css + inline tsx)')
