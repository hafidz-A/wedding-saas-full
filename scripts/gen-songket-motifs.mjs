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
  lepusCell,
  bungaMawar,
  daun,
  bungaCogan,
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

/* ── Ragam motif: six songket types, parallel to the original set above ──
   Each has a BADAN (body texture) tile and a KEPALA (end border) tile, both
   masks. ⚠️ Interpretations — see the design doc §0 "Ragam motif kain". */

// Woven lattice edge shared by every kepala tile (diamonds between threads).
const latticeEdge = (W) => {
  let b = `<g fill="currentColor"><rect x="0" y="0" width="${W}" height="2.4"/><rect x="0" y="13" width="${W}" height="1.6"/>`
  for (let x = 6; x < W; x += 12) b += `<path d="M${x} 3.5 l4 4 l-4 4 l-4 -4 Z"/>`
  return b + '</g>'
}
const rot = (deg) => ` rotate(${deg})`

/* LEPUS — gold covers almost the whole cloth: nampan-perak cells packed in a
   diamond lattice, edge to edge. */
const lepusBadan = () => {
  let b = at(24, 24, lepusCell({ w: 48 }))
  for (const [x, y] of [[0, 0], [48, 0], [0, 48], [48, 48]]) b += at(x, y, lepusCell({ w: 48 }))
  return svg(48, 48, b)
}
const lepusKepala = () => {
  let b = latticeEdge(40)
  b += at(20, 16, pucukRebung({ height: 70 }), rot(180))
  b += '<g fill="currentColor">' + [0, 40].map((x) => `<path d="M${x} 20 l5 5 l-5 5 l-5 -5 Z"/><path d="M${x} 40 l4 4 l-4 4 l-4 -4 Z"/>`).join('') + '</g>'
  return svg(40, 92, b)
}

/* TABUR — small motifs "sown" across the cloth with space between them. */
const taburBadan = () => {
  let b = at(24, 24, bungaTabur({ r: 9 })) + at(72, 72, bungaTabur({ r: 9 }))
  b += '<g fill="currentColor">' + [[72, 24], [24, 72]].map(([x, y]) => `<path d="M${x} ${y - 5} l2 3 l3 2 l-3 2 l-2 3 l-2 -3 l-3 -2 l3 -2 Z"/>`).join('') + '</g>'
  return svg(96, 96, b)
}
const taburKepala = () => {
  let b = latticeEdge(60)
  b += at(30, 34, bungaTabur({ r: 8 }))
  b += '<g fill="currentColor">' + [0, 60].map((x) => `<circle cx="${x}" cy="30" r="2.4"/><circle cx="${x}" cy="44" r="1.6"/>`).join('') + '</g>'
  return svg(60, 56, b)
}

/* BUNGA-BUNGA — floral: a running vine with roses, small blossoms and leaves. */
const bungaBadan = () => {
  let b = '<path d="M-10 170 C40 120 40 90 80 80 C120 70 120 40 170 -10" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>'
  b += at(80, 80, bungaMawar({ r: 17 }))
  b += at(34, 122, bungaTabur({ r: 8 })) + at(126, 38, bungaTabur({ r: 8 }))
  for (const [x, y, d] of [[52, 104, -40], [62, 92, 130], [104, 62, 140], [98, 74, -50], [22, 150, 20], [140, 18, 200]]) {
    b += at(x, y, daun({ L: 18 }), rot(d))
  }
  b += at(22, 40, bungaMawar({ r: 7 })) + at(140, 122, bungaMawar({ r: 7 }))
  return svg(160, 160, b)
}
const bungaKepala = () => {
  let b = latticeEdge(160)
  b += '<path d="M0 22 Q40 62 80 22 T160 22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'
  b += at(40, 46, bungaMawar({ r: 11 })) + at(120, 46, bungaMawar({ r: 11 }))
  for (const [x, y, d] of [[18, 32, 200], [62, 32, 160], [98, 32, 200], [142, 32, 160]]) b += at(x, y, daun({ L: 13 }), rot(d))
  b += at(80, 20, bungaTabur({ r: 5 })) + at(0, 20, bungaTabur({ r: 5 })) + at(160, 20, bungaTabur({ r: 5 }))
  return svg(160, 76, b)
}

/* LIMAR — songket combined with weft ikat: soft-edged ikat fields of a second
   colour (separate mask, painted with --limar) under gold Bunga Cogan. */
const limarIkat = () => {
  const blur = '<defs><filter id="ikat" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.4"/></filter></defs>'
  const diamond = (cx, cy) =>
    `<path d="M${cx} ${cy - 26} L${cx + 40} ${cy} L${cx} ${cy + 26} L${cx - 40} ${cy} Z"/>` +
    `<path d="M${cx - 52} ${cy} l6 -6 l6 6 l-6 6 Z"/>`
  let b = '<g fill="currentColor" filter="url(#ikat)">'
  b += diamond(60, 40)
  for (const [x, y] of [[0, 0], [120, 0], [0, 80], [120, 80]]) b += diamond(x, y)
  b += '</g>'
  return svg(120, 80, blur + b)
}
const limarBadan = () => {
  let b = at(60, 40, bungaCogan({ r: 12 }))
  for (const [x, y] of [[0, 0], [120, 0], [0, 80], [120, 80]]) b += at(x, y, bungaCogan({ r: 9 }))
  b += '<g fill="currentColor">' + [[0, 40], [120, 40], [60, 0], [60, 80]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2"/>`).join('') + '</g>'
  return svg(120, 80, b)
}
const limarKepala = () => {
  let b = latticeEdge(80)
  b += '<path d="M0 22 L20 40 L40 22 L60 40 L80 22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/>'
  b += '<path d="M0 30 L20 48 L40 30 L60 48 L80 30" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>'
  b += at(40, 58, bungaCogan({ r: 9 }))
  return svg(80, 72, b)
}

/* TRETES MENDER — the body is plain; all the gold lives on the edges and the
   ends, so its kepala is the richest band (big tumpal + a second small row). */
const tretesKepala = () => {
  let b = latticeEdge(120)
  b += at(60, 16, pucukRebung({ height: 104 }), rot(180))
  for (const x of [0, 120]) b += at(x, 16, pucukRebung({ height: 54 }), rot(180))
  b += '<g fill="currentColor">' + [30, 90].map((x) => `<path d="M${x} 24 l4 4 l-4 4 l-4 -4 Z"/>`).join('') + '</g>'
  return svg(120, 124, b)
}

/* RUMPAK — motifs set in rows that alternate with plain stripes, each row of
   framed blocks (petak) shifted half a step from the last. */
const rumpakBadan = () => {
  const row = (y, offset) => {
    let r = `<g fill="currentColor"><rect x="0" y="${y}" width="96" height="1.8"/><rect x="0" y="${y + 28}" width="96" height="1.8"/></g>`
    for (const x of [offset, offset + 48, offset - 48]) {
      r += `<rect x="${x + 4}" y="${y + 5}" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6"/>`
      r += at(x + 14, y + 15, bungaTabur({ r: 6 }))
    }
    return r
  }
  return svg(96, 96, row(2, 0) + row(50, 24))
}
const rumpakKepala = () => {
  let b = latticeEdge(48)
  b += '<rect x="4" y="20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6"/>'
  b += '<path d="M12 23 l5 5 l-5 5 l-5 -5 Z" fill="currentColor"/>'
  b += '<path d="M36 22 l6 6 l-6 6 l-6 -6 Z" fill="currentColor"/>'
  b += '<rect x="0" y="40" width="48" height="1.6" fill="currentColor"/>'
  return svg(48, 46, b)
}

const files = {
  [`lepus-${VERSION}.svg`]: lepusTile(),
  [`kepala-kain-${VERSION}.svg`]: kepalaKainTile(),
  [`anyaman-band-${VERSION}.svg`]: anyamanBandTile(),
  [`roset-anyaman-${VERSION}.svg`]: rosetteTile(),
  // ragam motif
  [`lepus-padat-${VERSION}.svg`]: lepusBadan(),
  [`kepala-lepus-${VERSION}.svg`]: lepusKepala(),
  [`tabur-${VERSION}.svg`]: taburBadan(),
  [`kepala-tabur-${VERSION}.svg`]: taburKepala(),
  [`bunga-${VERSION}.svg`]: bungaBadan(),
  [`kepala-bunga-${VERSION}.svg`]: bungaKepala(),
  [`limar-ikat-${VERSION}.svg`]: limarIkat(),
  [`limar-cogan-${VERSION}.svg`]: limarBadan(),
  [`kepala-limar-${VERSION}.svg`]: limarKepala(),
  [`kepala-tretes-${VERSION}.svg`]: tretesKepala(),
  [`rumpak-${VERSION}.svg`]: rumpakBadan(),
  [`kepala-rumpak-${VERSION}.svg`]: rumpakKepala(),
}
for (const [name, content] of Object.entries(files)) {
  writeFileSync(join(outDir, name), content)
  console.log(`wrote public/songket/motifs/${name} (${content.length} bytes)`)
}
