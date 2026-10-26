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
