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
   like a celestial divider: a four-point sparkle, the line breaking into
   dots that curl inward into a small loop and come back, a pair of little
   wings, and a crescent moon near the end. One path (subpaths for the pen
   lifts), so the draw-on reveals it in order; dots are tiny circles. k is
   the inward direction (+1 on the left edge, -1 on the right). A stretch too
   short to carry it stays a plain line. */

const f = (n) => n.toFixed(1)

function sparkle(x, y, r) {
  const a = r * 0.12
  return (
    ` M${f(x)},${f(y - r)} C${f(x + a)},${f(y - a * 2)} ${f(x + a * 2)},${f(y - a)} ${f(x + r * 0.62)},${f(y)}` +
    ` C${f(x + a * 2)},${f(y + a)} ${f(x + a)},${f(y + a * 2)} ${f(x)},${f(y + r)}` +
    ` C${f(x - a)},${f(y + a * 2)} ${f(x - a * 2)},${f(y + a)} ${f(x - r * 0.62)},${f(y)}` +
    ` C${f(x - a * 2)},${f(y - a)} ${f(x - a)},${f(y - a * 2)} ${f(x)},${f(y - r)}` +
    // tiny diagonal glints
    ` M${f(x - r * 0.3)},${f(y - r * 0.3)} L${f(x - r * 0.45)},${f(y - r * 0.45)}` +
    ` M${f(x + r * 0.3)},${f(y + r * 0.3)} L${f(x + r * 0.45)},${f(y + r * 0.45)}` +
    ` M${f(x + r * 0.3)},${f(y - r * 0.3)} L${f(x + r * 0.45)},${f(y - r * 0.45)}` +
    ` M${f(x - r * 0.3)},${f(y + r * 0.3)} L${f(x - r * 0.45)},${f(y + r * 0.45)}`
  )
}

const dot = (x, y, r = 0.7) => ` M${f(x - r)},${f(y)} a${r},${r} 0 1,0 ${f(2 * r)},0 a${r},${r} 0 1,0 ${f(-2 * r)},0`

/** Dots every `gap` px along a polyline sampled from fn(t), t in 0..1. */
function dotted(fn, gap, n = 240) {
  let out = ''
  let [px, py] = fn(0)
  let acc = gap
  for (let i = 1; i <= n; i++) {
    const [x, y] = fn(i / n)
    acc += Math.hypot(x - px, y - py)
    if (acc >= gap) {
      out += dot(x, y)
      acc = 0
    }
    px = x
    py = y
  }
  return out
}

const cubic = (p0, p1, p2, p3) => (t) => {
  const u = 1 - t
  return [0, 1].map((i) => u * u * u * p0[i] + 3 * u * u * t * p1[i] + 3 * u * t * t * p2[i] + t * t * t * p3[i])
}

export function celestial(x, k, ya, yb) {
  const L = yb - ya
  if (L < 150) return ` V${f(yb)}`
  const star = ya + L * 0.2
  const sr = 13
  const d0 = ya + L * 0.36
  const d1 = ya + L * 0.68
  const H = d1 - d0
  const wing = ya + L * 0.78
  const moon = ya + L * 0.9
  let d = ` V${f(star - sr)}` + sparkle(x, star, sr)
  // a pair of dots each side of the sparkle
  d += dot(x + k * sr * 1.05, star, 0.9) + dot(x - k * sr * 1.05, star, 0.9)
  d += ` M${f(x)},${f(star + sr)} V${f(d0)}`
  // the line breaks into dots: out, a small loop, and back to the edge
  // kept within ~16px of the edge, clear of full-width fields (which start 22px in)
  const cxL = x + k * 10
  const loopY = d0 + H * 0.5
  d += dotted(cubic([x, d0], [x, d0 + H * 0.18], [cxL + k * 3, d0 + H * 0.12], [cxL, loopY - 5]), 4.2)
  d += dotted((t) => [cxL + k * 5 * Math.sin(t * Math.PI * 2), loopY - 5 * Math.cos(t * Math.PI * 2)], 4.2, 90)
  d += dotted(cubic([cxL, loopY - 5], [cxL - k * 2, d0 + H * 0.85], [x, d0 + H * 0.82], [x, d1]), 4.2)
  // little wings, then the crescent
  d += ` M${f(x)},${f(d1)} V${f(wing - 3)}`
  d += ` M${f(x - 11)},${f(wing - 5)} Q${f(x - 4)},${f(wing - 4)} ${f(x)},${f(wing + 2)} Q${f(x + 4)},${f(wing - 4)} ${f(x + 11)},${f(wing - 5)}`
  d += ` M${f(x)},${f(wing + 2)} V${f(moon - 9)}`
  d += ` M${f(x - 7)},${f(moon - 4)} A8,8 0 1,0 ${f(x + 7)},${f(moon - 4)} A6.4,6.4 0 1,1 ${f(x - 7)},${f(moon - 4)}`
  d += dot(x, moon + 12, 0.9) + ` M${f(x)},${f(moon + 16)} V${f(yb)}`
  return d
}
