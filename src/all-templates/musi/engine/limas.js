/* ============================================================
   musi/engine/limas.js — chapter 0: the Rumah Limas, outside and in.

   A Palembang stilt house (rumah panggung) the guest walks INTO, room by
   room, in the order a visitor meets them:

     garang        the front veranda with carved railings, reached by two
                   stairs at its left and right ends
     lawang kipas  the front wall: panels hinged at the top that fold up and
                   out like a fan, opening the house into one hall for a
                   celebration (animated by scroll, setOpen)
     kekijing      the stepped floors, higher toward the inside: guests sit
                   lesehan on mats, the young near the door, elders higher up
     gegajah       the main hall on the highest floor: red-black-gold (prada)
                   carving, a chandelier, carved cabinets with ceramics and
                   songket, a tepak sirih, an amben for elders, and the
                   pelaminan with the bride and groom in Aesan Gede
     pangkeng      bedrooms either side of the hall behind carved partitions
     dapur         the kitchen behind, a step lower, with its own back stair

   Then a steep two-tier limas roof with gold simbar horns, a courtyard full of
   guests, a festive tent with musicians, lanterns and jasmine.

   addLimasHouse() is reused (closed, without the interior) for the row of
   houses along the river (city.js). Local frame: the house faces +z, centred
   on x = 0, front wall at z = +6, back wall at z = −12.
   ============================================================ */
import * as THREE from 'three'
import { Kit, ball, box, cone, cyl, frustum, instanced, rng, setInstance } from './kit.js'

const PI = Math.PI
const _axis = new THREE.Vector3()

/** House dimensions, shared with the camera tour in scene.js. */
export const HOUSE = {
  halfW: 8,
  front: 6,
  back: -12,
  wallTop: 6.4,
  hinge: 6.3, // lawang kipas hinge height
  garang: { y: 2.0, z0: 6, z1: 9.8 },
  // kekijing: the floor steps up toward the inside, the main hall highest
  levels: [
    { name: 'kekijing-1', z0: 2, z1: 6, y: 2.4 },
    { name: 'kekijing-2', z0: -1.5, z1: 2, y: 2.75 },
    { name: 'kekijing-3', z0: -5, z1: -1.5, y: 3.1 },
    { name: 'gegajah', z0: -12, z1: -5, y: 3.45 },
  ],
  stairX: 6.3, // the two garang stairs, at x = ±stairX
  partitionX: 5, // pangkeng partitions
  partitionZ: [-5, -9.4],
  backDoor: [4.4, 6.0], // doorway in the back wall to the dapur
  dapur: { x0: 3.6, x1: 8.8, z0: -17, z1: -12, y: 2.4 },
  foldAngle: 1.26, // lawang kipas opened: 72°
}

/** World matrix for a house placed at (x, z), turned ry, scaled s. */
export function placement(x, y, z, ry = 0, s = 1) {
  return new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)),
    new THREE.Vector3(s, s, s),
  )
}

const H = HOUSE
const W = H.halfW * 2
const D = H.front - H.back

/**
 * Add one Rumah Limas to `kit` under matrix `m`.
 * opts.interior: build the rooms inside (only the house the guest walks into);
 * opts.panels: a separate Kit that receives the lawang kipas panels in
 * hinge-local coordinates, so they can fold (otherwise they are built closed);
 * opts.lanterns: paper lanterns along the garang eave.
 */
export function addLimasHouse(kit, m, { interior = false, panels = null, lanterns = true } = {}) {
  const add = (role, geo, t = {}) => kit.add(role, geo, { ...t, m })
  const levelAt = (z) => H.levels.find((l) => z >= l.z0 && z <= l.z1) || H.levels[0]

  // stilts, each as tall as the floor above it
  for (const x of [-7.6, -3.8, 0, 3.8, 7.6]) {
    for (const z of [-11.6, -8.4, -5.2, -2, 1.2, 4.4, 5.8]) {
      const y = levelAt(z).y
      add('woodDark', cyl(0.17, 0.2, y, 6), { p: [x, y / 2, z] })
    }
  }
  // the stepped floors, with gold-trimmed risers between them
  H.levels.forEach((l, i) => {
    add('woodDark', box(W + 0.4, 0.26, l.z1 - l.z0), { p: [0, l.y, (l.z0 + l.z1) / 2] })
    if (interior) add('woodLight', box(W - 0.3, 0.04, l.z1 - l.z0 - 0.05), { p: [0, l.y + 0.15, (l.z0 + l.z1) / 2] })
    if (i > 0) {
      const lower = H.levels[i - 1].y
      const rise = l.y - lower
      add('wood', box(W - 0.3, rise, 0.1), { p: [0, lower + 0.13 + rise / 2, l.z1] })
      add('trim', box(W - 0.3, 0.07, 0.12), { p: [0, l.y + 0.16, l.z1 + 0.02] })
      if (interior) {
        // carved prada strip on every riser
        for (let x = -7.2; x <= 7.2; x += 0.9) add('trim', box(0.3, 0.3 * rise, 0.04), { p: [x, lower + 0.13 + rise / 2, l.z1 + 0.06], r: [0, 0, PI / 4] })
      }
    }
  })

  // side and back walls (the back wall leaves a doorway down to the dapur)
  const wy0 = 2.5
  const wt = H.wallTop
  const wh = wt - wy0
  const wc = (wy0 + wh / 2)
  const zc = (H.front + H.back) / 2
  for (const s of [-1, 1]) {
    add('wood', box(0.2, wh, D), { p: [s * H.halfW, wc, zc] })
    add('trim', box(0.24, 0.12, D), { p: [s * H.halfW, wt - 0.08, zc] })
    add('trim', box(0.24, 0.12, D), { p: [s * H.halfW, wy0 + 0.06, zc] })
    // big windows: bright from inside, framed in gold outside
    for (const z of [3.6, -3.2, -10.6]) {
      add(interior ? 'daylight' : 'window', box(0.26, 1.6, 2.0), { p: [s * H.halfW, 4.3, z] })
      for (const dy of [-0.86, 0.86]) add('trim', box(0.3, 0.1, 2.2), { p: [s * H.halfW, 4.3 + dy, z] })
      for (const dz of [-1.06, 1.06]) add('trim', box(0.3, 1.8, 0.1), { p: [s * H.halfW, 4.3, z + dz] })
    }
  }
  const [d0, d1] = H.backDoor
  add('wood', box(d0 + H.halfW, wh, 0.2), { p: [(-H.halfW + d0) / 2, wc, H.back] })
  add('wood', box(H.halfW - d1, wh, 0.2), { p: [(d1 + H.halfW) / 2, wc, H.back] })
  add('wood', box(d1 - d0, wt - 5.7, 0.2), { p: [(d0 + d1) / 2, (5.7 + wt) / 2, H.back] })
  if (!interior) add('woodDark', box(d1 - d0, 5.7 - wy0, 0.1), { p: [(d0 + d1) / 2, (5.7 + wy0) / 2, H.back] })

  // the lawang kipas: six carved panels hanging from one hinge line
  const pw = W / 6
  const ph = H.hinge - wy0
  const panelKit = panels || kit
  const pm = panels ? null : new THREE.Matrix4().makeTranslation(0, H.hinge, H.front).premultiply(m)
  const padd = (role, geo, t = {}) => panelKit.add(role, geo, pm ? { ...t, m: pm } : t)
  for (let i = 0; i < 6; i++) {
    const cx = -H.halfW + pw * (i + 0.5)
    padd('wood', box(pw - 0.04, ph, 0.14), { p: [cx, -ph / 2, 0] })
    for (const dy of [-0.08, -ph + 0.08]) padd('trim', box(pw - 0.1, 0.1, 0.18), { p: [cx, dy, 0] })
    for (const dx of [-pw / 2 + 0.07, pw / 2 - 0.07]) padd('trim', box(0.1, ph - 0.1, 0.18), { p: [cx + dx, -ph / 2, 0] })
    padd('trim', box(pw - 0.6, 0.62, 0.17), { p: [cx, -0.62, 0] })
    padd('songket', box(pw - 0.82, 0.42, 0.19), { p: [cx, -0.62, 0] })
    if (i === 1 || i === 4) {
      padd('window', box(1.3, 1.4, 0.18), { p: [cx, -2.1, 0] })
    } else {
      // carved lattice: gold lozenges
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 2; c++) padd('trim', box(0.34, 0.34, 0.17), { p: [cx - 0.42 + c * 0.84, -1.55 - r * 0.62, 0], r: [0, 0, PI / 4] })
      }
    }
  }

  // two-tier limas roof with gold edges and simbar horns on the ridge
  add('roof', frustum(W + 3, D + 3.4, W - 2, D - 3, 1.7), { p: [0, wt, zc] })
  add('roof', frustum(W - 2, D - 3, 6, 0.6, 5.2), { p: [0, wt + 1.7, zc] })
  const eave = (y, w, d) => {
    add('trim', box(w, 0.16, 0.18), { p: [0, y, zc + d / 2] })
    add('trim', box(w, 0.16, 0.18), { p: [0, y, zc - d / 2] })
    add('trim', box(0.18, 0.16, d), { p: [w / 2, y, zc] })
    add('trim', box(0.18, 0.16, d), { p: [-w / 2, y, zc] })
  }
  eave(wt + 0.05, W + 3, D + 3.4)
  eave(wt + 1.75, W - 2, D - 3)
  add('trim', box(6.4, 0.22, 0.8), { p: [0, wt + 6.95, zc] })
  for (let i = 0; i < 6; i++) {
    const x = -2.6 + i * 1.04
    add('trim', cone(0.13, 1.0, 5), { p: [x - 0.13, wt + 7.5, zc], r: [0, 0, 0.45] })
    add('trim', cone(0.13, 1.0, 5), { p: [x + 0.13, wt + 7.5, zc], r: [0, 0, -0.45] })
  }
  for (const s of [-1, 1]) add('trim', cone(0.17, 1.5, 5), { p: [s * 3.25, wt + 7.55, zc], r: [0, 0, -s * 0.35] })

  // the garang: floor, carved railings with gaps for the two side stairs
  const g = H.garang
  add('woodDark', box(W + 0.4, 0.22, g.z1 - g.z0), { p: [0, g.y, (g.z0 + g.z1) / 2] })
  add('trim', box(W + 0.5, 0.08, 0.08), { p: [0, g.y + 0.13, g.z1] })
  const sx0 = H.stairX - 0.95
  const sx1 = H.stairX + 0.95
  for (const [x0, x1] of [[-H.halfW - 0.1, -sx1], [-sx0, sx0], [sx1, H.halfW + 0.1]]) {
    const w = x1 - x0
    add('trim', box(w, 0.12, 0.12), { p: [(x0 + x1) / 2, g.y + 0.98, g.z1 - 0.1] })
    add('trim', box(w, 0.07, 0.07), { p: [(x0 + x1) / 2, g.y + 0.5, g.z1 - 0.1] })
    for (let x = x0 + 0.2; x < x1; x += 0.42) add('woodLight', box(0.07, 0.9, 0.07), { p: [x, g.y + 0.55, g.z1 - 0.1] })
  }
  for (const s of [-1, 1]) {
    add('trim', box(0.12, 0.12, g.z1 - g.z0), { p: [s * (H.halfW + 0.1), g.y + 0.98, (g.z0 + g.z1) / 2] })
    for (let z = g.z0 + 0.3; z < g.z1; z += 0.42) add('woodLight', box(0.07, 0.9, 0.07), { p: [s * (H.halfW + 0.1), g.y + 0.55, z] })
  }
  for (const x of [-H.halfW, -3.8, 3.8, H.halfW]) {
    add('woodDark', cyl(0.15, 0.17, g.y, 6), { p: [x, g.y / 2, g.z1 - 0.2] })
    add('wood', cyl(0.1, 0.1, 3.6, 6), { p: [x, g.y + 1.8, g.z1 - 0.15] })
  }
  // garang roof, high enough for the lawang kipas to fold up under it
  const rl = 4.3
  const rd = 1.05
  add('roof', box(W + 1, 0.18, Math.hypot(rl, rd)), { p: [0, wt - rd / 2 + 0.05, H.front + rl / 2], r: [Math.atan2(rd, rl), 0, 0] })
  add('trim', box(W + 1.1, 0.16, 0.16), { p: [0, wt - rd, H.front + rl] })
  if (lanterns) {
    for (const x of [-6, -2, 2]) {
      add('woodDark', box(0.02, 0.35, 0.02), { p: [x, 5.12, H.front + rl - 0.2] })
      add('lantern', cyl(0.2, 0.2, 0.42, 8), { p: [x, 4.74, H.front + rl - 0.2] })
      add('trim', cyl(0.12, 0.2, 0.06, 8), { p: [x, 4.98, H.front + rl - 0.2] })
    }
  }
  // the two stairs, at the left and right ends of the garang
  for (const s of [-1, 1]) {
    for (let i = 0; i < 6; i++) {
      const y = g.y - (i + 1) * 0.333
      add('wood', box(1.8, 0.12, 0.5), { p: [s * H.stairX, y + 0.06, g.z1 + 0.25 + i * 0.5] })
    }
    for (const e of [-0.95, 0.95]) {
      const len = Math.hypot(3.0, g.y)
      add('trim', box(0.12, 0.16, len), { p: [s * H.stairX + e, g.y / 2 + 0.15, g.z1 + 1.5], r: [Math.atan2(g.y, 3.0), 0, 0] })
      add('trim', box(0.12, 0.85, 0.12), { p: [s * H.stairX + e, 0.45, g.z1 + 2.9] })
    }
  }

  if (interior) addInterior(kit, m)
}

/** The rooms inside: hall, carvings, pelaminan, pangkeng, dapur. */
function addInterior(kit, m) {
  const add = (role, geo, t = {}) => kit.add(role, geo, { ...t, m })
  const G = H.levels[3]
  const gy = G.y + 0.15 // standing height on the gegajah floor
  const wt = H.wallTop
  const zc = (H.front + H.back) / 2

  // ceiling with gold beams
  add('woodDark', box(W, 0.14, D), { p: [0, wt + 0.07, zc] })
  for (let z = H.back + 1.5; z < H.front; z += 3) add('trim', box(W, 0.18, 0.22), { p: [0, wt - 0.08, z] })
  for (const x of [-4, 0, 4]) add('wood', box(0.24, 0.22, D), { p: [x, wt - 0.12, zc] })

  // mats on the kekijing: pandan tikar near the door, red permadani higher up,
  // a red runner up the middle to the pelaminan
  const [l1, l2, l3] = H.levels
  for (const s of [-1, 1]) {
    add('tikar', box(5.6, 0.03, l1.z1 - l1.z0 - 0.8), { p: [s * 4.4, l1.y + 0.18, (l1.z0 + l1.z1) / 2] })
    for (const l of [l2, l3]) {
      add('songket', box(5.6, 0.03, l.z1 - l.z0 - 0.7), { p: [s * 4.4, l.y + 0.18, (l.z0 + l.z1) / 2] })
      add('trim', box(5.7, 0.025, 0.12), { p: [s * 4.4, l.y + 0.185, l.z1 - 0.3] })
    }
  }
  add('songket', box(1.6, 0.035, D - 0.6), { p: [0, l1.y + 0.19, zc + 0.3] })
  // the runner climbs each riser
  for (const l of [l2, l3, G]) add('songket', box(1.6, l.y - 0.3, 0.04), { p: [0, l.y - (l.y - 0.3) / 2 + 0.16, l.z1 + 0.13] })

  // pangkeng: carved partitions with doors either side of the gegajah
  const [pz0, pz1] = H.partitionZ
  const pl = pz0 - pz1
  const ph = wt - gy
  for (const s of [-1, 1]) {
    const x = s * H.partitionX
    add('wood', box(0.16, ph, pl), { p: [x, gy + ph / 2, (pz0 + pz1) / 2] })
    add('trim', box(0.2, 0.12, pl), { p: [x, gy + ph - 0.3, (pz0 + pz1) / 2] })
    add('trim', box(0.2, 0.12, pl), { p: [x, gy + 0.3, (pz0 + pz1) / 2] })
    // the door: black lacquer, gold frame
    add('lacquer', box(0.2, 2.2, 1.1), { p: [x, gy + 1.1, -6.3] })
    add('trim', box(0.24, 0.12, 1.3), { p: [x, gy + 2.26, -6.3] })
    for (const dz of [-0.62, 0.62]) add('trim', box(0.24, 2.3, 0.1), { p: [x, gy + 1.15, -6.3 + dz] })
    // carved prada rosettes above and beside the door
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 3; c++) {
        const z = -7.3 - c * 0.75
        const y = gy + 1.1 + r * 0.9
        add('songket', box(0.19, 0.6, 0.6), { p: [x, y, z] })
        add('trim', cyl(0.2, 0.2, 0.22, 8), { p: [x, y, z], r: [0, 0, PI / 2] })
      }
    }
  }

  // amben: low platforms where the elders sit, at the front of the hall
  for (const s of [-1, 1]) {
    add('lacquer', box(2.2, 0.35, 2.4), { p: [s * 3.4, G.y + 0.32, -6.2] })
    add('trim', box(2.3, 0.06, 2.5), { p: [s * 3.4, G.y + 0.5, -6.2] })
    add('songket', box(2.0, 0.05, 2.2), { p: [s * 3.4, G.y + 0.53, -6.2] })
  }

  // lemari ukir: carved black-and-gold cabinets with ceramics and songket
  const lemari = (mm) => {
    const a = (role, geo, t = {}) => kit.add(role, geo, { ...t, m: mm })
    a('lacquer', box(2.0, 2.6, 0.6), { p: [0, 1.3, 0] })
    a('trim', frustum(2.3, 0.7, 1.6, 0.5, 0.4), { p: [0, 2.6, 0] })
    for (const dx of [-0.98, 0.98]) a('trim', box(0.08, 2.6, 0.64), { p: [dx, 1.3, 0] })
    for (const y of [0.55, 1.2, 1.85]) a('trim', box(1.9, 0.05, 0.62), { p: [0, y, 0] })
    for (let i = 0; i < 3; i++) {
      a(i % 2 ? 'white' : 'ceramic', cyl(0.22, 0.22, 0.04, 12), { p: [-0.55 + i * 0.55, 1.47, 0.22], r: [PI / 2, 0, 0] })
      a('white', cyl(0.1, 0.16, 0.36, 8), { p: [-0.55 + i * 0.55, 0.78, 0.05] })
    }
    a('songket', box(1.5, 0.22, 0.4), { p: [0, 2.0, 0.05] })
    a('trim', box(1.5, 0.05, 0.42), { p: [0, 2.12, 0.05] })
  }
  const atM = (x, y, z, ry) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), new THREE.Vector3(1, 1, 1)).premultiply(m)
  lemari(atM(-6.4, gy, -11.55, 0))
  lemari(atM(4.62, gy, -8.4, -PI / 2))

  // the pelaminan against the back wall
  const pz = H.back + 0.2
  add('lacquer', box(8.4, 0.32, 2.8), { p: [0, G.y + 0.31, pz + 1.3] })
  add('trim', box(8.5, 0.07, 2.9), { p: [0, G.y + 0.48, pz + 1.3] })
  const dy = G.y + 0.47
  add('songket', box(7.6, 2.9, 0.18), { p: [0, dy + 1.45, pz] })
  add('trim', box(7.9, 0.18, 0.24), { p: [0, dy + 2.9, pz + 0.02] })
  add('trim', box(7.9, 0.14, 0.24), { p: [0, dy + 0.05, pz + 0.02] })
  for (const dx of [-3.85, 3.85]) add('trim', box(0.2, 2.95, 0.24), { p: [dx, dy + 1.45, pz + 0.02] })
  add('trim', frustum(7.2, 0.3, 3.0, 0.3, 0.75), { p: [0, dy + 2.98, pz] })
  for (let i = 0; i < 7; i++) add('trim', cone(0.1, 0.7, 5), { p: [-2.4 + i * 0.8, dy + 3.9, pz], r: [0, 0, (i - 3) * -0.12] })
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 7; c++) add('trim', box(0.42, 0.42, 0.05), { p: [-3 + c, dy + 0.85 + r * 1.2, pz + 0.12], r: [0, 0, PI / 4] })
  }
  add('trim', box(2.8, 0.5, 0.8), { p: [0, dy + 0.25, pz + 0.75] })
  add('trim', box(2.8, 0.9, 0.16), { p: [0, dy + 0.7, pz + 0.38] })
  addFigure(kit, m, [-0.6, dy, pz + 1.55], { bride: true })
  addFigure(kit, m, [0.6, dy, pz + 1.55], { bride: false })
  for (const s of [-1, 1]) {
    // gold standing lamps and jasmine bouquets
    add('trim', cyl(0.05, 0.08, 2.0, 6), { p: [s * 3.5, dy + 1.0, pz + 1.9] })
    add('door', ball(0.22, 1), { p: [s * 3.5, dy + 2.1, pz + 1.9] })
    add('trim', cyl(0.18, 0.12, 0.4, 8), { p: [s * 2.5, dy + 0.2, pz + 2.2] })
    for (let k = 0; k < 6; k++) add('white', ball(0.1, 0), { p: [s * 2.5 + Math.cos(k) * 0.14, dy + 0.48 + (k % 2) * 0.08, pz + 2.2 + Math.sin(k) * 0.14] })
  }

  // tepak sirih on a low table in front of the dais: welcome for the guests
  add('lacquer', box(1.2, 0.36, 0.7), { p: [0, gy + 0.18, -8.6] })
  add('trim', box(1.26, 0.05, 0.76), { p: [0, gy + 0.37, -8.6] })
  add('trim', box(0.56, 0.24, 0.36), { p: [0, gy + 0.52, -8.6] })
  add('trim', frustum(0.6, 0.4, 0.44, 0.24, 0.1), { p: [0, gy + 0.64, -8.6] })

  // lampu gantung: a gold chandelier over the hall
  // (hung short: the camera walks under it on the way to the pelaminan)
  const cz = -7.8
  add('trim', cyl(0.03, 0.03, 0.3, 5), { p: [0, wt - 0.15, cz] })
  add('trim', new THREE.TorusGeometry(0.85, 0.06, 6, 18), { p: [0, wt - 0.42, cz], r: [PI / 2, 0, 0] })
  add('trim', new THREE.TorusGeometry(0.5, 0.05, 6, 14), { p: [0, wt - 0.62, cz], r: [PI / 2, 0, 0] })
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * PI * 2
    add('door', ball(0.11, 0), { p: [Math.cos(a) * 0.85, wt - 0.3, cz + Math.sin(a) * 0.85] })
  }
  add('door', ball(0.18, 1), { p: [0, wt - 0.8, cz] })

  // the dapur: a step lower behind the back wall, its own back stair
  const k = H.dapur
  const [d0, d1] = H.backDoor
  for (let i = 0; i < 3; i++) add('wood', box(d1 - d0, 0.1, 0.42), { p: [(d0 + d1) / 2, G.y + 0.05 - (i + 1) * 0.35, H.back - 0.25 - i * 0.42] })
  add('woodDark', box(k.x1 - k.x0, 0.24, k.z1 - k.z0), { p: [(k.x0 + k.x1) / 2, k.y, (k.z0 + k.z1) / 2] })
  for (const x of [k.x0 + 0.3, k.x1 - 0.3]) {
    for (const z of [k.z0 + 0.3, k.z1 - 0.6]) add('woodDark', cyl(0.15, 0.17, k.y, 6), { p: [x, k.y / 2, z] })
  }
  const kh = 2.9
  add('wood', box(0.16, kh, k.z1 - k.z0), { p: [k.x0, k.y + kh / 2, (k.z0 + k.z1) / 2] })
  add('wood', box(0.16, kh, k.z1 - k.z0), { p: [k.x1, k.y + kh / 2, (k.z0 + k.z1) / 2] })
  add('wood', box(k.x1 - k.x0, kh, 0.16), { p: [(k.x0 + k.x1) / 2, k.y + kh / 2, k.z0] })
  // its roof overhangs on three sides only: never through the back wall into the hall
  add('zinc', frustum(k.x1 - k.x0 + 1.2, k.z1 - k.z0 + 0.5, k.x1 - k.x0 - 1, 0.3, 1.6), { p: [(k.x0 + k.x1) / 2, k.y + kh, (k.z0 + k.z1) / 2 - 0.25] })
  add('woodDark', box(k.x1 - k.x0, 0.1, k.z1 - k.z0), { p: [(k.x0 + k.x1) / 2, k.y + kh - 0.05, (k.z0 + k.z1) / 2] })
  // tungku (clay stove) with pots and embers, a shelf, water jars
  add('stone', box(1.8, 0.7, 0.9), { p: [6.4, k.y + 0.47, -16.3] })
  add('door', box(1.2, 0.18, 0.05), { p: [6.4, k.y + 0.4, -15.83] })
  for (const dx of [-0.45, 0.45]) add('dark', cyl(0.3, 0.22, 0.35, 10), { p: [6.4 + dx, k.y + 0.98, -16.3] })
  add('woodLight', box(0.4, 0.06, 2.4), { p: [8.45, k.y + 1.7, -14.6] })
  for (let i = 0; i < 4; i++) add(i % 2 ? 'white' : 'ceramic', cyl(0.12, 0.09, 0.26, 8), { p: [8.45, k.y + 1.86, -15.6 + i * 0.6] })
  for (const z of [-13.4, -14.3]) add('trunk', cyl(0.28, 0.4, 0.8, 9), { p: [8.1, k.y + 0.52, z] })
  add('door', ball(0.14, 0), { p: [4.0, k.y + 2.2, -14.8] })
  // the back stair down to the yard
  for (let i = 0; i < 5; i++) add('wood', box(1.4, 0.1, 0.42), { p: [5.0, k.y - (i + 1) * 0.42, k.z0 - 0.25 - i * 0.42] })
}

/** A standing figure in Aesan Gede (bride with a kesuhun crown, groom with a cap). */
function addFigure(kit, m, [x, y, z], { bride }) {
  const add = (role, geo, t = {}) => kit.add(role, geo, { ...t, m })
  add('songket', cyl(0.2, 0.32, 1.15, 8), { p: [x, y + 0.58, z] })
  add('trim', cyl(0.24, 0.24, 0.12, 8), { p: [x, y + 1.05, z] })
  add('trim', cyl(0.3, 0.33, 0.05, 8), { p: [x, y + 0.2, z] })
  add('skin', ball(0.15, 1), { p: [x, y + 1.32, z] })
  if (bride) {
    add('trim', cone(0.17, 0.5, 6), { p: [x, y + 1.62, z] })
    for (const dx of [-0.13, 0.13]) add('trim', ball(0.04, 0), { p: [x + dx, y + 1.5, z + 0.07] })
  } else {
    add('trim', cyl(0.15, 0.17, 0.22, 8), { p: [x, y + 1.5, z] })
  }
}

/** One person-shaped figure, split into three instanced parts. */
const BODY = () => cyl(0.2, 0.3, 1.1, 6).translate(0, 0.55, 0)
const HEAD = () => ball(0.15, 0).translate(0, 1.3, 0)
const HAT = () => cyl(0.13, 0.17, 0.2, 6).translate(0, 1.46, 0)

/** Courtyard dress colours (songket reds, gold, greens, purples, teluk belanga). */
const DRESS = ['#8f1d21', '#b8323a', '#d6a43a', '#2f6b52', '#5e2f7a', '#1f3a6b', '#f1e6cf', '#c45a2a', '#7a1d4a', '#2a2a3a']
const SKIN = ['#c58c5f', '#a8714a', '#d9a477', '#8d5a3b']
const HATS = ['#8f1d21', '#d6a43a', '#2a2a3a', '#f1e6cf', '#5e2f7a', '#2f6b52']

/** The whole courtyard scene. */
export function createLimas(mats, quality) {
  const group = new THREE.Group()
  group.name = 'limas'
  const rand = rng(1931)
  const kit = new Kit()

  // the lawang kipas panels fold about one hinge line: their own pivot group
  const kipasKit = new Kit()
  addLimasHouse(kit, placement(0, 0, 0), { interior: true, panels: kipasKit })
  const kipas = new THREE.Group()
  kipas.position.set(0, HOUSE.hinge, HOUSE.front)
  kipasKit.build(kipas, mats, { cast: true, receive: true })
  group.add(kipas)

  // ground, path, lantern poles, flower beds
  kit.add('grass', box(320, 0.2, 320), { p: [0, -0.1, 0] })
  kit.add('path', box(3.4, 0.05, 34), { p: [0, 0.02, 29.4] })
  for (const z of [14.5, 19, 23.5]) {
    for (const s of [-1, 1]) {
      if (s > 0 && z > 20) continue // the walk to the right-hand stair passes here
      kit.add('wood', cyl(0.06, 0.08, 2.7, 6), { p: [s * 2.7, 1.35, z] })
      kit.add('wood', box(0.5, 0.06, 0.06), { p: [s * 2.48, 2.66, z] })
      kit.add('lantern', cyl(0.19, 0.19, 0.4, 8), { p: [s * 2.3, 2.4, z] })
      kit.add('trim', cyl(0.11, 0.19, 0.06, 8), { p: [s * 2.3, 2.62, z] })
    }
  }
  for (const s of [-1, 1]) kit.add('leafDark', box(0.9, 0.22, 26), { p: [s * 2.25, 0.1, 27] })

  // festive tent (tarub) with a scalloped songket valance, musicians under it
  const tent = [14.5, 0, 20]
  for (const dx of [-4, 4]) {
    for (const dz of [-4, 4]) kit.add('cloth', cyl(0.09, 0.09, 3.2, 6), { p: [tent[0] + dx, 1.6, tent[2] + dz] })
  }
  kit.add('cloth', frustum(9.6, 9.6, 0.4, 0.4, 2.3), { p: [tent[0], 3.2, tent[2]] })
  kit.add('trim', box(9.7, 0.14, 0.14), { p: [tent[0], 3.22, tent[2] + 4.8] })
  for (let i = 0; i < 10; i++) {
    kit.add('songket', cone(0.42, 0.55, 3), { p: [tent[0] - 4.3 + i * 0.95, 2.95, tent[2] + 4.82], r: [PI, 0, 0] })
  }
  kit.add('woodDark', cyl(0.32, 0.32, 0.5, 10), { p: [tent[0] - 1.2, 0.25, tent[2] + 1], r: [0, 0, PI / 2] })
  kit.add('woodLight', cyl(0.28, 0.28, 0.42, 10), { p: [tent[0] + 1.3, 0.21, tent[2] + 1.4], r: [PI / 2, 0, 0] })
  kit.add('cream', box(5, 0.3, 2), { p: [tent[0], 0.15, tent[2] - 2.6] })

  // buffet tables under lanterns on the left
  for (const z of [18, 24, 30]) {
    kit.add('cloth', box(1.4, 0.82, 4.2), { p: [-11, 0.41, z] })
    kit.add('songket', box(1.45, 0.16, 4.25), { p: [-11, 0.74, z] })
    kit.add('trim', cyl(0.3, 0.38, 0.22, 8), { p: [-11, 0.93, z - 1] })
    kit.add('trim', cyl(0.3, 0.38, 0.22, 8), { p: [-11, 0.93, z + 1] })
  }

  // fence along the sides of the yard
  for (const s of [-1, 1]) {
    kit.add('wood', box(0.1, 0.1, 40), { p: [s * 22, 0.95, 26] })
    for (let z = 6; z <= 46; z += 2) kit.add('woodDark', box(0.14, 1.2, 0.14), { p: [s * 22, 0.6, z] })
  }

  // trees: round crowns and coconut palms around the yard
  const tree = (x, z, sc) => {
    kit.add('trunk', cyl(0.18 * sc, 0.28 * sc, 2.6 * sc, 6), { p: [x, 1.3 * sc, z] })
    kit.add(rand() < 0.5 ? 'leaf' : 'leafDark', ball(1.7 * sc, 0), { p: [x, 3.4 * sc, z], r: [rand(), rand(), 0] })
    kit.add('leaf', ball(1.1 * sc, 0), { p: [x + 0.9 * sc, 2.9 * sc, z + 0.4 * sc], r: [rand(), 0, rand()] })
  }
  const palm = (x, z, sc) => {
    const lean = (rand() - 0.5) * 0.3
    kit.add('trunk', cyl(0.13 * sc, 0.2 * sc, 7 * sc, 6), { p: [x, 3.5 * sc, z], r: [0, 0, lean] })
    const tx = x - Math.sin(lean) * 7 * sc
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * PI * 2 + rand()
      // tip the frond outward and a little down: rotate +y about the axis
      // perpendicular to its direction (axis-angle, not Euler)
      const leaf = new THREE.Matrix4()
        .makeRotationAxis(_axis.set(Math.sin(a), 0, -Math.cos(a)), 1.85)
        .setPosition(tx + Math.cos(a) * 1.4 * sc, 6.7 * sc, z + Math.sin(a) * 1.4 * sc)
      kit.add('leafDark', cone(0.45 * sc, 3.4 * sc, 3), { s: [1, 1, 0.25], m: leaf })
    }
  }
  for (let i = 0; i < 46; i++) {
    const side = rand() < 0.5 ? -1 : 1
    const zone = rand()
    let x
    let z
    if (zone < 0.45) {
      x = (rand() - 0.5) * 80
      z = -14 - rand() * 40
    } else {
      x = side * (25 + rand() * 30)
      z = -10 + rand() * 60
    }
    if (rand() < 0.3) palm(x, z, 0.9 + rand() * 0.4)
    else tree(x, z, 1 + rand() * 0.8)
  }

  kit.build(group, mats, { cast: true, receive: true, noCast: ['grass', 'path', 'door'] })

  // jasmine (melati) and red blooms along the path: two instanced layers
  const flowerGeo = ball(0.09, 0)
  const nFlowers = quality === 'low' ? 120 : 260
  const melati = instanced(flowerGeo, mats.get('white'), nFlowers)
  const red = instanced(flowerGeo.clone(), mats.get('lantern'), Math.round(nFlowers / 3))
  for (let i = 0; i < nFlowers; i++) {
    const s = i % 2 ? 1 : -1
    setInstance(melati, i, [s * (1.95 + rand() * 0.6), 0.27, 14.5 + rand() * 25], [0, 0, 0], 0.8 + rand() * 0.6)
  }
  for (let i = 0; i < red.count; i++) {
    const s = i % 2 ? 1 : -1
    setInstance(red, i, [s * (1.95 + rand() * 0.6), 0.29, 14.5 + rand() * 25], [0, 0, 0], 0.9 + rand() * 0.5)
  }
  group.add(melati, red)

  // the guests: three instanced parts per person, moved every frame. The
  // guests sitting lesehan inside come first, so a lower quality tier trims
  // the courtyard crowd and never empties the house.
  const seats = []
  {
    const [l1, l2, l3, G] = HOUSE.levels
    const row = (n, y, z0, z1, xs, elder) => {
      for (let i = 0; i < n; i++) {
        const side = i % 2 ? 1 : -1
        seats.push({ x: side * (xs[0] + rand() * (xs[1] - xs[0])), y, z: z0 + rand() * (z1 - z0), elder })
      }
    }
    row(8, l1.y + 0.17, l1.z0 + 0.6, l1.z1 - 0.6, [2.2, 6.6], false) // the young, near the door
    row(6, l2.y + 0.17, l2.z0 + 0.5, l2.z1 - 0.5, [2.2, 6.6], false)
    row(6, l3.y + 0.17, l3.z0 + 0.5, l3.z1 - 0.5, [2.2, 6.6], true) // elders higher up
    for (const sx of [-1, 1]) for (const dx of [-0.5, 0.5]) seats.push({ x: sx * 3.4 + dx, y: G.y + 0.55, z: -6.2 + dx, elder: true }) // on the amben
    for (let i = 0; i < 5; i++) seats.push({ x: -7 + i * 1.15, y: HOUSE.garang.y + 0.13, z: 8.3 + (i % 2) * 0.6, elder: false }) // on the garang
  }
  const crowd = quality === 'high' ? 84 : quality === 'medium' ? 48 : 22
  const total = seats.length + crowd
  const body = instanced(BODY(), new THREE.MeshStandardMaterial({ roughness: 0.75, flatShading: true }), total, { cast: true })
  const head = instanced(HEAD(), new THREE.MeshStandardMaterial({ roughness: 0.8, flatShading: true }), total, { cast: true })
  const hat = instanced(HAT(), new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0.2, flatShading: true }), total)
  const col = new THREE.Color()
  const people = []
  const place = () => {
    for (let k = 0; k < 40; k++) {
      const x = (rand() - 0.5) * 36
      const z = 13 + rand() * 28
      if (Math.abs(x) < 3.1) continue
      if (x > 2.6 && x < 9.6 && z > 11.5 && z < 26) continue // the walk to the right-hand stair
      if (x > 9.5 && x < 19.5 && z > 15 && z < 25) continue
      if (x < -9.5 && x > -12.5 && z > 15 && z < 33) continue
      return [x, z]
    }
    return [-8, 36]
  }
  for (let i = 0; i < seats.length; i++) {
    const st = seats[i]
    people.push({ x: st.x, z: st.z, y: st.y, kind: 'seated', scale: 0.95, ry: st.x < 0 ? PI / 2 : -PI / 2, phase: rand() * PI * 2, speed: 1, hat: [1, 1, 1] })
    body.setColorAt(i, col.set(DRESS[Math.floor(rand() * DRESS.length)]))
    head.setColorAt(i, col.set(SKIN[Math.floor(rand() * SKIN.length)]))
    hat.setColorAt(i, col.set(st.elder ? (rand() < 0.5 ? '#f1e6cf' : '#2a2a3a') : HATS[Math.floor(rand() * HATS.length)]))
  }
  for (let j = 0; j < crowd; j++) {
    const i = seats.length + j
    const kind = j < 4 ? 'musician' : j < 4 + Math.round(crowd * 0.12) ? 'walker' : 'guest'
    let x
    let z
    if (kind === 'musician') {
      x = tent[0] - 2.4 + j * 1.6
      z = tent[2] + (j % 2 ? 0.2 : 1.8)
    } else if (kind === 'walker') {
      x = (j % 2 ? 1 : -1) * 1.0
      z = 14 + rand() * 26
    } else {
      ;[x, z] = place()
    }
    const child = kind === 'guest' && rand() < 0.15
    const female = rand() < 0.5
    people.push({
      x,
      z,
      kind,
      scale: child ? 0.62 : 0.92 + rand() * 0.16,
      ry: kind === 'musician' ? 0 : PI + (rand() - 0.5) * 1.6,
      phase: rand() * PI * 2,
      speed: kind === 'walker' ? 0.9 + rand() * 0.4 : 1.2 + rand() * 1.6,
      hat: female ? [1.3, 1.5, 1.3] : [1, 1, 1],
    })
    body.setColorAt(i, col.set(DRESS[Math.floor(rand() * DRESS.length)]))
    head.setColorAt(i, col.set(SKIN[Math.floor(rand() * SKIN.length)]))
    hat.setColorAt(i, col.set(HATS[Math.floor(rand() * HATS.length)]))
  }
  group.add(body, head, hat)

  // warm light spilling out of the open door. Returned, not added: the engine
  // keeps it in the scene root and dims it to 0 away from the house, because a
  // light inside a hidden group changes the light count and recompiles every
  // material at the chapter switch.
  const doorLight = new THREE.PointLight('#ffb760', 10, 16, 1.6)
  doorLight.position.set(0, 4.6, 3.2)
  // and the chandelier over the gegajah
  const hallLight = new THREE.PointLight('#ffc27a', 22, 20, 1.5)
  hallLight.position.set(0, HOUSE.wallTop - 1.1, -7.8)

  let visibleCount = total
  function update(dt, time, reduce) {
    for (let i = 0; i < visibleCount; i++) {
      const p = people[i]
      if (p.kind === 'seated') {
        // sitting lesehan: a short body, the head lowered onto it
        const nod = reduce ? 0 : Math.sin(time * 0.8 + p.phase) * 0.04
        setInstance(body, i, [p.x, p.y, p.z], [0, p.ry, 0], [p.scale, p.scale * 0.6, p.scale])
        setInstance(head, i, [p.x, p.y - 0.46 * p.scale, p.z], [nod, p.ry, 0], p.scale)
        setInstance(hat, i, [p.x, p.y - 0.46 * p.scale, p.z], [nod, p.ry, 0], p.scale)
        continue
      }
      if (p.kind === 'walker' && !reduce) {
        p.z -= dt * p.speed
        if (p.z < 13.2) p.z = 40 + Math.random() * 3
      }
      const bob = reduce ? 0 : Math.abs(Math.sin(time * p.speed * 2 + p.phase)) * (p.kind === 'walker' ? 0.06 : 0.03)
      const sway = reduce ? 0 : Math.sin(time * p.speed + p.phase) * 0.05
      const ry = p.kind === 'walker' ? PI : p.ry
      const r = [0, ry, sway]
      setInstance(body, i, [p.x, bob, p.z], r, p.scale)
      setInstance(head, i, [p.x, bob, p.z], r, p.scale)
      const hs = p.hat.map((v) => v * p.scale)
      setInstance(hat, i, [p.x, bob - (p.hat[0] > 1 ? 0.18 * p.scale : 0), p.z], r, hs)
    }
    body.instanceMatrix.needsUpdate = true
    head.instanceMatrix.needsUpdate = true
    hat.instanceMatrix.needsUpdate = true
  }
  update(0, 0, true)

  return {
    group,
    doorLight,
    hallLight,
    update,
    /** Fold the lawang kipas: 0 closed, 1 opened up under the garang roof. */
    setOpen(k) {
      kipas.rotation.x = -HOUSE.foldAngle * k
    },
    setQuality(q) {
      visibleCount = seats.length + (q === 'high' ? crowd : q === 'medium' ? Math.min(crowd, 48) : Math.min(crowd, 22))
      body.count = head.count = hat.count = visibleCount
    },
    dispose() {
      group.traverse((o) => {
        if (o.isMesh) o.geometry.dispose()
      })
      body.material.dispose()
      head.material.dispose()
      hat.material.dispose()
    },
  }
}
