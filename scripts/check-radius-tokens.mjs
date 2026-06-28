#!/usr/bin/env node
/**
 * Radius-token drift guard.
 *
 * After the 2026-06 radius consolidation there is ONE global radius scale
 * (`--radius-*` in src/styles/tokens.css) plus Solary's scoped `--r-*`. This
 * check protects exactly the two things that were cleaned up — it deliberately
 * does NOT police every bespoke per-element radius (hand-tuned values like a
 * 28px hero card or 2–6px micro-details are legitimate and intentional).
 *
 * Fails the build if a CSS file reintroduces either:
 *   1. the dead `--border-radius-*` namespace, or
 *   2. a raw `999px` in a `border-radius` declaration (use --radius-pill /
 *      --r-pill instead). Token DEFINITIONS (`--radius-pill: 999px`) are exempt.
 *
 * Run: `npm run check:radius`
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..')
const srcDir = join(root, 'src')

/** Recursively collect every *.css file under src/. */
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

const offenses = []
for (const file of cssFiles(srcDir)) {
  const lines = readFileSync(file, 'utf8').split('\n')
  lines.forEach((line, i) => {
    const trimmed = line.trim()
    // 1. dead legacy namespace — only real USES (var(...)) or DEFINITIONS
    //    (`--border-radius-x:`), so doc-comment prose mentioning the old name
    //    doesn't trip it.
    if (/var\(\s*--border-radius-/.test(line) || /^--border-radius-[\w-]*\s*:/.test(trimmed)) {
      offenses.push({ file, line: i + 1, text: trimmed, why: 'dead --border-radius-* namespace; use --radius-*' })
    }
    // 2. raw 999px in a border-radius rule (token definitions like `--radius-pill: 999px` are fine)
    if (/border-radius\s*:[^;]*\b999px\b/.test(line) && !trimmed.startsWith('--')) {
      offenses.push({ file, line: i + 1, text: trimmed, why: 'raw 999px; use var(--radius-pill) (or --r-pill in Solary)' })
    }
  })
}

if (offenses.length) {
  console.error(`\n✗ radius-token drift — ${offenses.length} issue(s):\n`)
  for (const o of offenses) {
    console.error(`  ${relative(root, o.file)}:${o.line}`)
    console.error(`     ${o.text}`)
    console.error(`     → ${o.why}\n`)
  }
  process.exit(1)
}

console.log('✓ radius tokens clean (no --border-radius-* namespace, no raw 999px)')
