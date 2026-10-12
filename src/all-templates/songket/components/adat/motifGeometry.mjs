/* ============================================================================
   Songket motif geometry — plain data + string builders, no React.

   Shared by the template's components (inline SVG) and by
   scripts/gen-songket-motifs.mjs (the CSS-mask tiles in public/songket/motifs),
   so a motif is drawn in exactly one place. `.mjs` so the Node script can
   import it directly.

   Original vector interpretations of traditional Palembang songket motifs (no
   tracing of any reference image):
     pucukRebung  → tumpal / bamboo shoot, stacked sulur scroll pairs + spear tip
     bungaTabur   → eight-petal scattered flower (tabur)
     pixelRosette → the woven "benang emas" look: an eight-point star built from
                    weave cells on a grid, as on the cloth itself
     wovenBand    → vertical woven selvedge: diamond lattice + hooks in cells
   Every builder returns inner SVG markup painted with `currentColor` (fills
   and, for the sulur, strokes) around a documented origin; the mask-tile
   generator swaps currentColor for black.
   ============================================================================ */

const f = (n) => Number(n.toFixed(2))

/** One sulur on the RIGHT of the stem at (0, y): an arm sweeping out and up
 *  that ends in an inward spiral — a STROKE path, so the curls stay open and
 *  lacy. `s` scales it; mirror with scale(-1 1). */
function sulurStroke(y, s) {
  const p = (x, dy) => `${f(x * s)} ${f(y + dy * s)}`
  return (
    `M${p(0, 0)} C${p(9, -1)} ${p(21, -6)} ${p(22, -18)} ` +
    `C${p(23, -28)} ${p(13, -31)} ${p(10, -25)} ` +
    `C${p(8, -20)} ${p(13, -17)} ${p(16, -20)} ` +
    `C${p(18, -23)} ${p(15, -25)} ${p(14, -23)}`
  )
}

/** Teardrop leaf riding on a sulur arm, pointing up and out. Filled. */
function leafOnArm(y, s) {
  const p = (x, dy) => `${f(x * s)} ${f(y + dy * s)}`
  return `M${p(4, -3)} C${p(3, -11)} ${p(7, -18)} ${p(12, -21)} C${p(12, -14)} ${p(9, -7)} ${p(4, -3)} Z`
}

/**
 * Pucuk rebung (tumpal): base centred at (0,0), pointing UP to y = -height.
 * Tiers of open sulur pairs, widest at the base so the silhouette tapers like
 * a bamboo shoot. `spear` adds the long solid blade of the lepus pair (badan
 * kain); without it the tip is a flame bud (kepala kain).
 */
export function pucukRebung({ height = 100, spear = false } = {}) {
  const k = height / 100
  const tiers = spear
    ? [[-3, 1.25], [-22, 0.9]]
    : [[-3, 1.55], [-26, 1.22], [-46, 0.95], [-63, 0.7], [-77, 0.48]]
  const strokes = []
  const fills = []
  for (const [y, sc] of tiers) {
    const d = sulurStroke(y * k, sc * k)
    strokes.push(`<path d="${d}"/>`, `<path transform="scale(-1 1)" d="${d}"/>`)
    const l = leafOnArm(y * k, sc * k)
    fills.push(`<path d="${l}"/>`, `<path transform="scale(-1 1)" d="${l}"/>`)
  }
  const top = spear ? -36 : -86
  strokes.push(`<path d="M0 ${f(2 * k)} V${f(top * k)}"/>`)
  // knots on the stem between tiers
  for (const [y] of tiers) fills.push(`<path d="M0 ${f((y - 4) * k)} l3 3 l-3 3 l-3 -3 Z"/>`)
  if (spear) {
    fills.push(
      `<path d="M-12 ${f(-34 * k)} C-7 ${f(-56 * k)} -3 ${f(-80 * k)} 0 ${f(-100 * k)} ` +
        `C3 ${f(-80 * k)} 7 ${f(-56 * k)} 12 ${f(-34 * k)} C5 ${f(-39 * k)} -5 ${f(-39 * k)} -12 ${f(-34 * k)} Z"/>`,
    )
  } else {
    fills.push(
      `<path d="M0 ${f(-100 * k)} C6 ${f(-94 * k)} 8 ${f(-88 * k)} 0 ${f(-80 * k)} ` +
        `C-8 ${f(-88 * k)} -6 ${f(-94 * k)} 0 ${f(-100 * k)} Z"/>`,
    )
  }
  fills.push(`<path d="M-28 ${f(2 * k)} L28 ${f(2 * k)} L24 ${f(6 * k)} L-24 ${f(6 * k)} Z"/>`)
  const sw = f(Math.max(1.6, 2.6 * k))
  return (
    `<g fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${strokes.join('')}</g>` +
    `<g fill="currentColor">${fills.join('')}</g>`
  )
}

/** Bunga tabur: eight pointed, notched petals around a four-dot heart. Centre (0,0), radius ~r. */
export function bungaTabur({ r = 30 } = {}) {
  const k = r / 30
  const petal = `M0 ${f(-30 * k)} C${f(5 * k)} ${f(-22 * k)} ${f(6 * k)} ${f(-14 * k)} ${f(2 * k)} ${f(-8 * k)} ` +
    `L0 ${f(-11 * k)} L${f(-2 * k)} ${f(-8 * k)} C${f(-6 * k)} ${f(-14 * k)} ${f(-5 * k)} ${f(-22 * k)} 0 ${f(-30 * k)} Z`
  const leaflet = `M0 ${f(-19 * k)} C${f(3 * k)} ${f(-16 * k)} ${f(3 * k)} ${f(-12 * k)} 0 ${f(-10 * k)} ` +
    `C${f(-3 * k)} ${f(-12 * k)} ${f(-3 * k)} ${f(-16 * k)} 0 ${f(-19 * k)} Z`
  const parts = []
  for (let i = 0; i < 8; i++) parts.push(`<path transform="rotate(${i * 45})" d="${petal}"/>`)
  for (let i = 0; i < 8; i++) parts.push(`<path transform="rotate(${i * 45 + 22.5})" d="${leaflet}"/>`)
  for (const [x, y] of [[0, -4], [4, 0], [0, 4], [-4, 0]]) {
    parts.push(`<circle cx="${f(x * k)}" cy="${f(y * k)}" r="${f(2.4 * k)}"/>`)
  }
  return `<g fill="currentColor">${parts.join('')}</g>`
}

/** Weave cells → squares with a gap, so it reads as woven gold thread. */
function cells(list, size, gap = 0.18) {
  const inset = size * gap
  return list
    .map(([x, y]) => `<rect x="${f(x * size + inset / 2)}" y="${f(y * size + inset / 2)}" width="${f(size - inset)}" height="${f(size - inset)}"/>`)
    .join('')
}

/** Eight-point woven star on an n×n grid (n odd): every cell whose centre lies
 *  inside an 8-point star polygon, with a hollow woven heart and a centre knot. */
export function pixelRosetteCells(n = 17) {
  const c = (n - 1) / 2
  const R = c + 0.4          // tip radius
  const r = c * 0.55         // valley radius
  const pts = []
  for (let i = 0; i < 16; i++) {
    const a = (i * Math.PI) / 8 - Math.PI / 2
    const rad = i % 2 === 0 ? R : r
    pts.push([Math.cos(a) * rad, Math.sin(a) * rad])
  }
  const inside = (x, y) => {
    let hit = false
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i]
      const [xj, yj] = pts[j]
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit
    }
    return hit
  }
  const out = []
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const dx = x - c
      const dy = y - c
      if (!inside(dx, dy)) continue
      const ring = Math.max(Math.abs(dx), Math.abs(dy))
      // woven checker across the body of the star, solid knot at the heart
      if (ring >= 2 && ring <= 4 && (Math.abs(dx) + Math.abs(dy)) % 2 === 0) continue
      out.push([x, y])
    }
  }
  return out
}

export function pixelRosette({ size = 64, n = 17 } = {}) {
  return `<g fill="currentColor">${cells(pixelRosetteCells(n), size / n)}</g>`
}

/** Vertical woven selvedge strip, `cols` cells wide, one period `rows` tall. */
export function wovenBandCells(cols = 7, rows = 14) {
  const c = (cols - 1) / 2
  const out = []
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const dy = Math.abs(y - rows / 2 + 0.5)
      const dx = Math.abs(x - c)
      const rail = x === 0 || x === cols - 1
      const diamond = Math.abs(dx + dy * (c / (rows / 2)) - c * 0.9) < 0.75
      const heart = dx + dy <= 1
      if (rail || diamond || heart) out.push([x, y])
    }
  }
  return out
}

export function wovenBand({ width = 28, cols = 7, rows = 14 } = {}) {
  return `<g fill="currentColor">${cells(wovenBandCells(cols, rows), width / cols)}</g>`
}

/* ── Ragam motif (the six songket types, parallel to the original set) ──────
   ⚠️ Interpretations from general knowledge of Palembang songket; to be
   checked by an adat source (see the design doc §0 "Ragam motif kain"). */

/** Lepus cell: a woven nampan-perak rosette framed by a lattice diamond —
 *  packed edge to edge, so gold covers most of the cloth. Cell w×w, centred. */
export function lepusCell({ w = 48, line } = {}) {
  const h = w / 2
  const k = w / 48
  // Line weight scales with the cell unless pinned: a big, airy cell keeps a
  // fine thread instead of a chunky one.
  const t = line ?? k
  const ring = []
  for (let i = 0; i < 8; i++) {
    ring.push(`<path transform="rotate(${i * 45})" d="M0 ${f(-13 * k)} L${f(3 * k)} ${f(-7 * k)} L0 ${f(-4 * k)} L${f(-3 * k)} ${f(-7 * k)} Z"/>`)
  }
  return (
    `<g fill="none" stroke="currentColor" stroke-width="${f(3.2 * t)}" stroke-linejoin="round">` +
    `<path d="M0 ${f(-h)} L${f(h)} 0 L0 ${f(h)} L${f(-h)} 0 Z"/>` +
    `<path d="M0 ${f(-h + 7 * k)} L${f(h - 7 * k)} 0 L0 ${f(h - 7 * k)} L${f(-h + 7 * k)} 0 Z" stroke-width="${f(1.4 * t)}"/></g>` +
    `<g fill="currentColor">${ring.join('')}<circle r="${f(3 * k)}"/>` +
    `<path d="M${f(-h)} ${f(-4 * k)} l${f(4 * k)} ${f(4 * k)} l${f(-4 * k)} ${f(4 * k)} Z"/>` +
    `<path d="M${f(h)} ${f(-4 * k)} l${f(-4 * k)} ${f(4 * k)} l${f(4 * k)} ${f(4 * k)} Z"/></g>`
  )
}

/** Bunga mawar: layered rounded petals (rose), centre (0,0), radius ~r. */
export function bungaMawar({ r = 20 } = {}) {
  const k = r / 20
  const parts = []
  for (let i = 0; i < 6; i++) {
    parts.push(`<path transform="rotate(${i * 60})" d="M0 0 C${f(-9 * k)} ${f(-6 * k)} ${f(-9 * k)} ${f(-20 * k)} 0 ${f(-20 * k)} C${f(9 * k)} ${f(-20 * k)} ${f(9 * k)} ${f(-6 * k)} 0 0 Z"/>`)
  }
  const inner = []
  for (let i = 0; i < 5; i++) {
    inner.push(`<path transform="rotate(${i * 72 + 36})" d="M0 0 C${f(-5 * k)} ${f(-4 * k)} ${f(-5 * k)} ${f(-11 * k)} 0 ${f(-11 * k)} C${f(5 * k)} ${f(-11 * k)} ${f(5 * k)} ${f(-4 * k)} 0 0 Z"/>`)
  }
  // outer petals as outlines, inner rosette solid — reads as layered petals
  // in a single colour (mask tiles cannot cut holes)
  return (
    `<g fill="none" stroke="currentColor" stroke-width="${f(2 * k)}" stroke-linejoin="round">${parts.join('')}</g>` +
    `<g fill="currentColor">${inner.join('')}<circle r="${f(2.6 * k)}"/></g>`
  )
}

/** Daun: pointed leaf with a midrib cut, base at (0,0) pointing up, length L. */
export function daun({ L = 24 } = {}) {
  const k = L / 24
  return (
    `<path fill="currentColor" d="M0 0 C${f(-9 * k)} ${f(-6 * k)} ${f(-8 * k)} ${f(-18 * k)} 0 ${f(-24 * k)} ` +
    `C${f(8 * k)} ${f(-18 * k)} ${f(9 * k)} ${f(-6 * k)} 0 0 Z"/>`
  )
}

/** Bunga cogan (Limar Bunga Cogan): four broad petals on the axes, four spear
 *  petals on the diagonals, a ringed heart — a crest-like flower. ⚠️ */
export function bungaCogan({ r = 22 } = {}) {
  const k = r / 22
  const broad = `M0 ${f(-4 * k)} C${f(-8 * k)} ${f(-8 * k)} ${f(-8 * k)} ${f(-18 * k)} 0 ${f(-22 * k)} C${f(8 * k)} ${f(-18 * k)} ${f(8 * k)} ${f(-8 * k)} 0 ${f(-4 * k)} Z`
  const spear = `M0 ${f(-6 * k)} L${f(2.6 * k)} ${f(-12 * k)} L0 ${f(-20 * k)} L${f(-2.6 * k)} ${f(-12 * k)} Z`
  const parts = []
  for (let i = 0; i < 4; i++) parts.push(`<path transform="rotate(${i * 90})" d="${broad}"/>`)
  for (let i = 0; i < 4; i++) parts.push(`<path transform="rotate(${i * 90 + 45})" d="${spear}"/>`)
  return (
    `<g fill="currentColor">${parts.join('')}<circle r="${f(3 * k)}"/></g>` +
    `<circle r="${f(6.5 * k)}" fill="none" stroke="currentColor" stroke-width="${f(1.4 * k)}"/>`
  )
}
