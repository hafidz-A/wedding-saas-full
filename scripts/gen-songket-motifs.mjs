#!/usr/bin/env node
/**
 * Generate the Songket template's CSS-mask pattern tiles into
 * public/songket/motifs/. Each tile is a single-colour (black) SVG used as a
 * `mask-image`, so the template paints it with the palette's gold-thread
 * gradient at runtime — one file serves every palette.
 *
 * The motifs themselves are drawn once, in
 * src/all-templates/songket/components/adat/motifGeometry.mjs.
 *
 * Usage: node scripts/gen-songket-motifs.mjs
 *
 * Filenames carry a version suffix (CLAUDE.md gotcha 11b: static assets are
 * cached without a content hash, so changing a tile means renaming it — bump
 * VERSION and update the CSS references).
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  pucukRebung,
  bungaTabur,
  pixelRosette,
  wovenBand,
} from '../src/all-templates/songket/components/adat/motifGeometry.mjs'

const VERSION = 'v1'
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'public', 'songket', 'motifs')
mkdirSync(outDir, { recursive: true })

const black = (markup) => markup.replaceAll('currentColor', '#000')
const svg = (w, h, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${black(body)}</svg>\n`
const at = (x, y, body, extra = '') => `<g transform="translate(${x} ${y})${extra}">${body}</g>`

/* 1. Lepus — badan kain: rows of back-to-back spear tumpal along a centre
      spine, columns of bunga tabur between them, small tumpal pairs on the
      off rows. Tile 280×128, two rows. */
function lepusTile() {
  const W = 280
  const rows = [32, 96]
  const pair = (cx, cy, len) =>
    at(cx, cy, pucukRebung({ height: len, spear: true }), ' rotate(90)') +
    at(cx, cy, pucukRebung({ height: len, spear: true }), ' rotate(-90)')
  let body = ''
  body += pair(W / 2, rows[0], 92) + pair(W / 2, rows[1], 92)
  for (const x of [0, W]) {
    body += at(x, rows[0], bungaTabur({ r: 21 }))
    body += pair(x, rows[1], 34)
  }
  return svg(W, 128, body)
}

/* 2. Kepala kain — the cloth's end border: a woven lattice edge with tumpal
      hanging from it and small tabur flowers between. Tile 120×112, tumpal
      pointing DOWN (flip with CSS for a bottom border). */
function kepalaKainTile() {
  const W = 120
  let body = ''
  // woven lattice edge: a row of small diamonds between two threads
  body += '<g fill="currentColor"><rect x="0" y="0" width="120" height="2.4"/><rect x="0" y="13" width="120" height="1.6"/>'
  for (let x = 6; x < W; x += 12) body += `<path d="M${x} 3.5 l4 4 l-4 4 l-4 -4 Z"/>`
  body += '</g>'
  body += at(W / 2, 18, pucukRebung({ height: 92 }), ' rotate(180)')
  for (const x of [0, W]) {
    body += at(x, 34, bungaTabur({ r: 8 }))
    body += at(x, 62, bungaTabur({ r: 5 }))
  }
  return svg(W, 112, body)
}

/* 3. Anyaman band — vertical woven selvedge, one period (28×56). */
function anyamanBandTile() {
  return svg(28, 56, wovenBand({ width: 28, cols: 7, rows: 14 }))
}

/* 4. Roset anyaman — a woven eight-point star with small knots at the
      corners, for the "benang emas" texture. Tile 120×120. */
function rosetteTile() {
  let body = at(30, 30, pixelRosette({ size: 60, n: 17 }))
  body += '<g fill="currentColor">'
  for (const [x, y] of [[0, 0], [120, 0], [0, 120], [120, 120]]) body += `<path d="M${x} ${y - 5} l5 5 l-5 5 l-5 -5 Z"/>`
  body += '</g>'
  return svg(120, 120, body)
}

const files = {
  [`lepus-${VERSION}.svg`]: lepusTile(),
  [`kepala-kain-${VERSION}.svg`]: kepalaKainTile(),
  [`anyaman-band-${VERSION}.svg`]: anyamanBandTile(),
  [`roset-anyaman-${VERSION}.svg`]: rosetteTile(),
}
for (const [name, content] of Object.entries(files)) {
  writeFileSync(join(outDir, name), content)
  console.log(`wrote public/songket/motifs/${name} (${content.length} bytes)`)
}
