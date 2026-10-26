/* ============================================================
   taman-bunga/config/ornaments.js — the one-line drawings on the card edges.

   Each is a single continuous stroke (absolute M/C path), drawn for the
   RIGHT edge of a card: the edge is x = 0, the line arrives from above at
   (0, 0), follows the drawing, and leaves straight down again at its last
   point. Negative x is inside the card. components/LineFrame.jsx mirrors
   them for the left edge and scales them to the card. Hand-drawn for this
   template (not traced).
   ============================================================ */

export const ORNAMENTS = {
  // a rose on its stem: swirl, cupped petals, two sepals, two leaves
  rose:
    'M0,0 C0,18 2,30 4,40 C0,34 -10,32 -14,38 C-18,44 -12,52 -4,50 C4,48 6,40 0,36 ' +
    'C-8,30 -22,34 -24,46 C-26,58 -22,70 -12,76 C-4,80 8,80 14,72 C20,62 18,48 10,42 ' +
    'C4,50 -2,60 -10,64 C-2,66 6,64 12,58 C10,70 4,78 0,82 C-8,82 -20,84 -28,80 ' +
    'C-20,88 -8,88 0,84 C8,88 20,88 28,82 C20,80 8,82 0,84 C0,100 -2,116 0,128 ' +
    'C-8,122 -22,124 -30,134 C-20,140 -6,138 0,130 C0,146 1,160 2,168 ' +
    'C8,160 22,156 28,148 C20,144 8,150 0,172',
  // a butterfly beside the edge: big forewing, antenna, second forewing, hindwing
  fly:
    'M0,0 C0,50 0,90 -4,116 C-8,130 -28,130 -40,108 C-52,100 -84,84 -88,60 ' +
    'C-92,36 -68,28 -56,42 C-46,54 -40,82 -40,108 C-39,78 -38,46 -34,22 ' +
    'C-33,14 -27,14 -28,20 C-29,24 -33,24 -34,22 C-36,48 -38,78 -40,108 ' +
    'C-36,90 -28,68 -20,50 C-15,40 -7,44 -10,58 C-14,76 -26,96 -40,108 ' +
    'C-54,112 -76,116 -80,132 C-84,148 -64,152 -56,140 C-50,130 -43,116 -40,108 ' +
    'C-42,116 -46,124 -50,128 C-46,142 -10,142 0,158',
}

/** Height of each drawing (its lowest point), so a short card can shrink it. */
export const ORNAMENT_HEIGHT = Object.fromEntries(
  Object.entries(ORNAMENTS).map(([k, d]) => [k, Math.max(...d.match(/-?[\d.]+,-?[\d.]+/g).map((p) => Number(p.split(',')[1])))]),
)

/* ---------- the celestial run along the rest of an edge ----------
   A straight stretch of the edge, x fixed, from y = ya down to y = yb, dressed
   as a celestial divider, top to bottom: two dots, a long-rayed starburst, a
   diamond bead, the line breaking into dots that swing inward into one round
   loop and come back, a small lotus, a pair of scrolled wings, and a crescent
   moon cradling a star, with a bead and dots below. One path (subpaths are
   the pen lifts), so the draw-on reveals it in order; dots are tiny circles.
   k is the inward direction (+1 on the left edge, -1 on the right). Nothing
   leaves the edge by more than ~16px each way: full-width fields start 22px
   in, and on a phone the card has 16px outside it. A stretch too short to
   carry it stays a plain line. Hand-drawn for this template. */

const f = (n) => n.toFixed(1)
// concave star with n points (rays given as [angle, length])
function star(x, y, rays, waist) {
  let d = ''
  rays.forEach(([a, len], i) => {
    const [na] = rays[(i + 1) % rays.length]
    const tip = [x + Math.sin(a) * len, y - Math.cos(a) * len]
    const mid = (a + (na < a ? na + Math.PI * 2 : na)) / 2
    const w = [x + Math.sin(mid) * waist, y - Math.cos(mid) * waist]
    const nt = [x + Math.sin(na) * rays[(i + 1) % rays.length][1], y - Math.cos(na) * rays[(i + 1) % rays.length][1]]
    if (i === 0) d += ` M${f(tip[0])},${f(tip[1])}`
    d += ` Q${f(w[0])},${f(w[1])} ${f(nt[0])},${f(nt[1])}`
  })
  return d
}
function starburst(x, y, r) {
  const P = Math.PI
  // long vertical rays, shorter horizontal, a small diagonal star behind, a ring at the heart
  let d = star(x, y, [[0, r * 2], [P / 2, r * 1.05], [P, r * 2], [P * 1.5, r * 1.05]], r * 0.13)
  d += star(x, y, [[P / 4, r * 0.7], [P * 0.75, r * 0.7], [P * 1.25, r * 0.7], [P * 1.75, r * 0.7]], r * 0.11)
  d += ` M${f(x + r * 0.2)},${f(y)} a${f(r * 0.2)},${f(r * 0.2)} 0 1,0 ${f(-r * 0.4)},0 a${f(r * 0.2)},${f(r * 0.2)} 0 1,0 ${f(r * 0.4)},0`
  // two glints beside it
  d += dot(x - r * 1.5, y - r * 0.9, 0.6) + dot(x + r * 1.5, y + r * 0.9, 0.6)
  return d
}
const dot = (x, y, r = 0.8) => ` M${f(x - r)},${f(y)} a${f(r)},${f(r)} 0 1,0 ${f(2 * r)},0 a${f(r)},${f(r)} 0 1,0 ${f(-2 * r)},0`
const diamond = (x, y, h) => ` M${f(x)},${f(y - h)} L${f(x + h * 0.45)},${f(y)} L${f(x)},${f(y + h)} L${f(x - h * 0.45)},${f(y)} Z`
function lotus(x, y, s) {
  // y = base of the bloom; petals open upward
  let d = ` M${f(x)},${f(y)} C${f(x - 5 * s)},${f(y - 6 * s)} ${f(x - 3 * s)},${f(y - 13 * s)} ${f(x)},${f(y - 17 * s)} C${f(x + 3 * s)},${f(y - 13 * s)} ${f(x + 5 * s)},${f(y - 6 * s)} ${f(x)},${f(y)}`
  for (const k of [-1, 1]) {
    d += ` M${f(x)},${f(y)} C${f(x + k * 3 * s)},${f(y - 8 * s)} ${f(x + k * 9 * s)},${f(y - 12 * s)} ${f(x + k * 13 * s)},${f(y - 11 * s)} C${f(x + k * 11 * s)},${f(y - 6 * s)} ${f(x + k * 6 * s)},${f(y - 1 * s)} ${f(x)},${f(y)}`
    d += ` M${f(x)},${f(y + 1 * s)} C${f(x + k * 6 * s)},${f(y + 1 * s)} ${f(x + k * 12 * s)},${f(y - 2 * s)} ${f(x + k * 16 * s)},${f(y - 6 * s)}`
  }
  d += ` M${f(x - 7 * s)},${f(y + 4 * s)} Q${f(x)},${f(y + 7 * s)} ${f(x + 7 * s)},${f(y + 4 * s)}`
  return d
}
function wings(x, y, s) {
  let d = ''
  for (const k of [-1, 1]) {
    // a swoop out and up that rolls outward into a small scroll
    d += ` M${f(x)},${f(y)} C${f(x + k * 5 * s)},${f(y - 1 * s)} ${f(x + k * 10 * s)},${f(y - 5 * s)} ${f(x + k * 12 * s)},${f(y - 11 * s)}` +
      ` C${f(x + k * 13 * s)},${f(y - 15 * s)} ${f(x + k * 17 * s)},${f(y - 15 * s)} ${f(x + k * 17 * s)},${f(y - 11.5 * s)}` +
      ` C${f(x + k * 17 * s)},${f(y - 9 * s)} ${f(x + k * 14.5 * s)},${f(y - 9 * s)} ${f(x + k * 14.5 * s)},${f(y - 11 * s)}`
    // a second, shorter feather inside it
    d += ` M${f(x)},${f(y - 4 * s)} C${f(x + k * 4 * s)},${f(y - 5 * s)} ${f(x + k * 7 * s)},${f(y - 8 * s)} ${f(x + k * 8 * s)},${f(y - 13 * s)}`
  }
  return d
}
function crescent(x, y, r) {
  // opening upward, with a small star in its lap and a drop below
  let d = ` M${f(x - r * 0.9)},${f(y - r * 0.45)} A${f(r)},${f(r)} 0 1,0 ${f(x + r * 0.9)},${f(y - r * 0.45)} A${f(r * 0.82)},${f(r * 0.82)} 0 1,1 ${f(x - r * 0.9)},${f(y - r * 0.45)}`
  const P = Math.PI
  d += star(x, y - r * 0.35, [[0, r * 0.42], [P / 2, r * 0.3], [P, r * 0.42], [P * 1.5, r * 0.3]], r * 0.06)
  return d
}
function dotted(fn, gap, n = 300) {
  let out = ''
  let [px, py] = fn(0)
  let acc = gap
  for (let i = 1; i <= n; i++) {
    const [x, y] = fn(i / n)
    acc += Math.hypot(x - px, y - py)
    if (acc >= gap) { out += dot(x, y, 0.75); acc = 0 }
    px = x; py = y
  }
  return out
}
const cubic = (p0, p1, p2, p3) => (t) => { const u = 1 - t; return [0, 1].map((i) => u * u * u * p0[i] + 3 * u * u * t * p1[i] + 3 * u * t * t * p2[i] + t * t * t * p3[i]) }
function loop(x, y0, y1, k) {
  // the line turns to dots, swings inward into one round loop, and comes back
  const H = y1 - y0
  const cy = y0 + H * 0.52
  const R = 7
  const cx = x + k * 7
  let d = dotted(cubic([x, y0], [x, y0 + H * 0.22], [cx + k * R, y0 + H * 0.26], [cx + k * R, cy]), 4.2)
  d += dotted((t) => [cx + k * R * Math.cos(t * Math.PI * 2), cy - R * Math.sin(t * Math.PI * 2)], 4.2, 120)
  d += dotted(cubic([cx + k * R, cy], [cx + k * R, y0 + H * 0.78], [x, y0 + H * 0.8], [x, y1]), 4.2)
  return d
}
export function celestial(x, k, ya, yb) {
  const L = yb - ya
  if (L < 170) return ` V${f(yb)}`
  const s = Math.min(0.85, L / 400)
  const sb = ya + 18 + 20 * s
  // the edge runs up to ya, then two dots, then the line again
  let d = ` V${f(ya)}` + dot(x, ya + 5, 0.8) + dot(x, ya + 10, 0.8) + ` M${f(x)},${f(ya + 15)}` + ` V${f(sb - 20 * s)}`
  d += starburst(x, sb, 10 * s)
  const dm = sb + 20 * s + L * 0.08
  d += ` M${f(x)},${f(sb + 20 * s)} V${f(dm - 5)}` + diamond(x, dm, 5) + ` M${f(x)},${f(dm + 5)}`
  const l0 = dm + 12, l1 = ya + L * 0.6
  d += ` V${f(l0)}` + loop(x, l0, l1, k)
  const lo = l1 + 26 * s
  d += ` M${f(x)},${f(l1)} V${f(lo - 17 * s)}` + lotus(x, lo, s) + ` M${f(x)},${f(lo + 2 * s)}`
  const wg = ya + L * 0.8
  d += ` V${f(wg)}` + wings(x, wg, s)
  const cm = ya + L * 0.9
  d += ` M${f(x)},${f(wg + 2 * s)} V${f(cm - 10 * s)}` + crescent(x, cm, 8 * s)
  d += ` M${f(x)},${f(cm + 8 * s)} V${f(cm + 12 * s)}` + diamond(x, cm + 16 * s, 3.5) + dot(x, cm + 25 * s, 0.8) + dot(x, yb - 6, 0.8)
  // leave the pen at (x, yb) so the edge carries on from here
  return d + ` M${f(x)},${f(yb)}`
}
