/* ============================================================
   musi/engine/limas.js — chapter 0: the Rumah Limas courtyard.

   A Palembang stilt house (rumah panggung): stepped floors (kekijing), a
   steep two-tier limas roof with gold simbar horns on the ridge, carved gold
   panels, a front veranda with railings, open doors with warm light inside,
   paper lanterns, the bride and groom in Aesan Gede on a pelaminan on the
   veranda, a festive tent with musicians and a courtyard full of guests.

   addLimasHouse() is reused for the row of houses along the river (city.js).
   Local frame: the house faces +z, centred on x = 0, front wall at z = +6.
   ============================================================ */
import * as THREE from 'three'
import { Kit, ball, box, cone, cyl, frustum, instanced, rng, setInstance } from './kit.js'

const PI = Math.PI
const _axis = new THREE.Vector3()

/** World matrix for a house placed at (x, z), turned ry, scaled s. */
export function placement(x, y, z, ry = 0, s = 1) {
  return new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)),
    new THREE.Vector3(s, s, s),
  )
}

/**
 * Add one Rumah Limas to `kit` under matrix `m`.
 * opts.open: doors open with the warm interior showing; opts.pelaminan: the
 * couple's dais on the veranda; opts.lanterns: lanterns along the eave.
 */
export function addLimasHouse(kit, m, { open = false, pelaminan = false, lanterns = true } = {}) {
  const add = (role, geo, t = {}) => kit.add(role, geo, { ...t, m })

  // stilts: three floor levels stepping up toward the back (kekijing)
  const levels = [
    { z0: 2, z1: 6, y: 2.4 },
    { z0: -2, z1: 2, y: 2.75 },
    { z0: -6, z1: -2, y: 3.1 },
  ]
  for (const x of [-6.6, -3.3, 0, 3.3, 6.6]) {
    for (const z of [-5.6, -2.8, 0, 2.8, 5.6]) {
      const lv = levels.find((l) => z >= l.z0 && z <= l.z1) || levels[0]
      add('woodDark', cyl(0.16, 0.19, lv.y, 6), { p: [x, lv.y / 2, z] })
    }
  }
  for (const l of levels) {
    add('woodDark', box(14.4, 0.26, l.z1 - l.z0), { p: [0, l.y, (l.z0 + l.z1) / 2] })
    add('trim', box(14.5, 0.08, 0.08), { p: [0, l.y + 0.14, l.z1] })
  }

  // walls (front wall built around the door and four windows)
  const wy0 = 2.5
  const wy1 = 5.8
  const wh = wy1 - wy0
  const wc = (wy0 + wy1) / 2
  add('wood', box(6.1, wh, 0.2), { p: [-3.95, wc, 6] })
  add('wood', box(6.1, wh, 0.2), { p: [3.95, wc, 6] })
  add('wood', box(1.8, wy1 - 5.05, 0.2), { p: [0, (5.05 + wy1) / 2, 6] })
  add('wood', box(0.2, wh + 0.7, 12), { p: [-7, wc + 0.35, 0] })
  add('wood', box(0.2, wh + 0.7, 12), { p: [7, wc + 0.35, 0] })
  add('wood', box(14, wh + 0.7, 0.2), { p: [0, wc + 0.35, -6] })
  // plank lines + gold bands (lis)
  for (const y of [3.3, 4.1]) add('woodLight', box(13.9, 0.05, 0.06), { p: [0, y, 6.12] })
  for (const y of [wy0 + 0.06, wy1 - 0.08]) add('trim', box(14.2, 0.12, 0.1), { p: [0, y, 6.14] })
  // windows with gold frames and carved panels above them
  for (const x of [-5.4, -2.7, 2.7, 5.4]) {
    add('window', box(1.15, 1.35, 0.08), { p: [x, 3.75, 6.1] })
    add('trim', box(1.4, 0.1, 0.12), { p: [x, 4.47, 6.14] })
    add('trim', box(1.4, 0.1, 0.12), { p: [x, 3.03, 6.14] })
    add('trim', box(0.1, 1.5, 0.12), { p: [x - 0.66, 3.75, 6.14] })
    add('trim', box(0.1, 1.5, 0.12), { p: [x + 0.66, 3.75, 6.14] })
    add('trim', box(1.25, 0.42, 0.08), { p: [x, 5.05, 6.13] })
    add('songket', box(1.05, 0.26, 0.09), { p: [x, 5.05, 6.15] })
  }
  // the door: frame, carved lintel, and two leaves
  add('trim', box(2.1, 0.16, 0.16), { p: [0, 5.08, 6.12] })
  add('trim', box(0.14, 2.6, 0.16), { p: [-0.97, 3.75, 6.12] })
  add('trim', box(0.14, 2.6, 0.16), { p: [0.97, 3.75, 6.12] })
  add('trim', box(1.9, 0.38, 0.1), { p: [0, 5.45, 6.13] })
  if (open) {
    const a = 1.25
    add('wood', box(0.9, 2.55, 0.08), { p: [-0.9 + Math.cos(a) * 0.45, 3.75, 6 - Math.sin(a) * 0.45], r: [0, a, 0] })
    add('wood', box(0.9, 2.55, 0.08), { p: [0.9 - Math.cos(a) * 0.45, 3.75, 6 - Math.sin(a) * 0.45], r: [0, -a, 0] })
    // the warm, lamp-lit inside: glowing back wall, a carved screen, a floor
    add('door', box(13.6, 3.2, 0.06), { p: [0, 4.3, -5.85] })
    add('trim', box(6, 2.2, 0.08), { p: [0, 4.4, -5.75] })
    add('songket', box(5.4, 1.7, 0.1), { p: [0, 4.4, -5.7] })
    add('door', box(1.7, 2.5, 0.04), { p: [0, 3.75, 5.6] })
  } else {
    add('woodDark', box(1.8, 2.55, 0.08), { p: [0, 3.75, 6.06] })
    add('trim', box(0.06, 2.4, 0.1), { p: [0, 3.75, 6.1] })
  }

  // two-tier limas roof with gold edges and simbar horns on the ridge
  add('roof', frustum(17, 15.6, 12.4, 10, 1.6), { p: [0, wy1, 0] })
  add('roof', frustum(12.4, 10, 5, 0.6, 4.6), { p: [0, wy1 + 1.6, 0] })
  const eave = (y, w, d) => {
    add('trim', box(w, 0.16, 0.18), { p: [0, y, d / 2] })
    add('trim', box(w, 0.16, 0.18), { p: [0, y, -d / 2] })
    add('trim', box(0.18, 0.16, d), { p: [w / 2, y, 0] })
    add('trim', box(0.18, 0.16, d), { p: [-w / 2, y, 0] })
  }
  eave(wy1 + 0.05, 17, 15.6)
  eave(wy1 + 1.65, 12.4, 10)
  add('trim', box(5.4, 0.22, 0.8), { p: [0, wy1 + 6.25, 0] })
  for (let i = 0; i < 5; i++) {
    const x = -2.2 + i * 1.1
    add('trim', cone(0.12, 0.95, 5), { p: [x - 0.12, wy1 + 6.75, 0], r: [0, 0, 0.45] })
    add('trim', cone(0.12, 0.95, 5), { p: [x + 0.12, wy1 + 6.75, 0], r: [0, 0, -0.45] })
  }
  for (const s of [-1, 1]) add('trim', cone(0.16, 1.4, 5), { p: [s * 2.75, wy1 + 6.8, 0], r: [0, 0, -s * 0.35] })

  // front veranda: floor, railings (gap for the stairs), lean-to roof, posts
  add('woodDark', box(14.4, 0.22, 3.6), { p: [0, 2.0, 7.8] })
  add('trim', box(14.5, 0.08, 0.08), { p: [0, 2.13, 9.6] })
  for (const [x0, x1] of [[-7.1, -1.25], [1.25, 7.1]]) {
    const w = x1 - x0
    add('trim', box(w, 0.12, 0.12), { p: [(x0 + x1) / 2, 2.98, 9.5] })
    add('trim', box(w, 0.07, 0.07), { p: [(x0 + x1) / 2, 2.5, 9.5] })
    for (let x = x0 + 0.2; x < x1; x += 0.45) add('woodLight', box(0.07, 0.9, 0.07), { p: [x, 2.55, 9.5] })
  }
  for (const s of [-1, 1]) {
    add('trim', box(0.12, 0.12, 3.5), { p: [s * 7.1, 2.98, 7.8] })
    for (let z = 6.3; z < 9.5; z += 0.45) add('woodLight', box(0.07, 0.9, 0.07), { p: [s * 7.1, 2.55, z] })
  }
  for (const x of [-6.6, -3.3, 3.3, 6.6]) {
    add('woodDark', cyl(0.14, 0.16, 2.0, 6), { p: [x, 1.0, 9.4] })
    add('wood', cyl(0.1, 0.1, 2.5, 6), { p: [x, 3.3, 9.45] })
  }
  const vr = Math.atan2(1.25, 3.9)
  add('roof', box(15.4, 0.18, Math.hypot(3.9, 1.25)), { p: [0, 5.08, 7.95], r: [vr, 0, 0] })
  add('trim', box(15.5, 0.16, 0.16), { p: [0, 4.45, 9.9] })
  if (lanterns) {
    for (const x of [-6, -4.2, 4.2, 6]) {
      add('woodDark', box(0.02, 0.3, 0.02), { p: [x, 4.25, 9.75] })
      add('lantern', cyl(0.2, 0.2, 0.42, 8), { p: [x, 3.9, 9.75] })
      add('trim', cyl(0.12, 0.2, 0.06, 8), { p: [x, 4.13, 9.75] })
    }
  }

  // front stairs down to the yard
  for (let i = 0; i < 6; i++) {
    const y = 2.0 - (i + 1) * 0.333
    add('wood', box(2.3, 0.12, 0.5), { p: [0, y + 0.06, 9.85 + i * 0.5] })
  }
  for (const s of [-1, 1]) {
    const len = Math.hypot(3.0, 2.0)
    add('trim', box(0.12, 0.16, len), { p: [s * 1.2, 1.15, 11.1], r: [Math.atan2(2.0, 3.0), 0, 0] })
    add('trim', box(0.12, 0.85, 0.12), { p: [s * 1.2, 0.45, 12.5] })
  }

  if (pelaminan) {
    // the dais: a songket backdrop in a gold frame, a gilded bench
    add('songket', box(3.4, 2.3, 0.1), { p: [-4.7, 3.35, 6.3] })
    add('trim', box(3.7, 0.16, 0.16), { p: [-4.7, 4.55, 6.35] })
    add('trim', box(3.7, 0.12, 0.14), { p: [-4.7, 2.2, 6.35] })
    for (const dx of [-1.8, 1.8]) add('trim', box(0.14, 2.4, 0.16), { p: [-4.7 + dx, 3.35, 6.35] })
    add('trim', frustum(3.4, 0.3, 1.2, 0.3, 0.55), { p: [-4.7, 4.63, 6.35] })
    for (let i = 0; i < 6; i++) add('trim', box(0.36, 0.36, 0.04), { p: [-6.05 + i * 0.54, 3.35, 6.37], r: [0, 0, PI / 4] })
    add('trim', box(2.5, 0.42, 0.75), { p: [-4.7, 2.33, 6.85] })
    add('trim', box(2.5, 0.75, 0.14), { p: [-4.7, 2.7, 6.5] })
    addFigure(kit, m, [-5.25, 2.12, 7.3], { bride: true })
    addFigure(kit, m, [-4.15, 2.12, 7.3], { bride: false })
  }
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

  addLimasHouse(kit, placement(0, 0, 0), { open: true, pelaminan: true })

  // ground, path, lantern poles, flower beds
  kit.add('grass', box(320, 0.2, 320), { p: [0, -0.1, 0] })
  kit.add('path', box(3.4, 0.05, 34), { p: [0, 0.02, 29.4] })
  for (const z of [14.5, 19, 23.5]) {
    for (const s of [-1, 1]) {
      kit.add('wood', cyl(0.06, 0.08, 2.7, 6), { p: [s * 2.7, 1.35, z] })
      kit.add('wood', box(0.5, 0.06, 0.06), { p: [s * 2.48, 2.66, z] })
      kit.add('lantern', cyl(0.19, 0.19, 0.4, 8), { p: [s * 2.3, 2.4, z] })
      kit.add('trim', cyl(0.11, 0.19, 0.06, 8), { p: [s * 2.3, 2.62, z] })
    }
  }
  for (const s of [-1, 1]) kit.add('leafDark', box(0.9, 0.22, 26), { p: [s * 2.25, 0.1, 27] })

  // festive tent (tarub) with a scalloped songket valance, musicians under it
  const tent = [12.5, 0, 20]
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

  // the guests: three instanced parts per person, moved every frame
  const total = quality === 'high' ? 84 : quality === 'medium' ? 48 : 22
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
      if (x > 7.5 && x < 17.5 && z > 15 && z < 25) continue
      if (x < -9.5 && x > -12.5 && z > 15 && z < 33) continue
      return [x, z]
    }
    return [-8, 36]
  }
  for (let i = 0; i < total; i++) {
    const kind = i < 4 ? 'musician' : i < 4 + Math.round(total * 0.12) ? 'walker' : 'guest'
    let x
    let z
    if (kind === 'musician') {
      x = tent[0] - 2.4 + i * 1.6
      z = tent[2] + (i % 2 ? 0.2 : 1.8)
    } else if (kind === 'walker') {
      x = (i % 2 ? 1 : -1) * 1.0
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
  const doorLight = new THREE.PointLight('#ffb760', 14, 16, 1.6)
  doorLight.position.set(0, 4.1, 3.2)

  let visibleCount = total
  function update(dt, time, reduce) {
    for (let i = 0; i < visibleCount; i++) {
      const p = people[i]
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
    update,
    setQuality(q) {
      visibleCount = q === 'high' ? total : q === 'medium' ? Math.min(total, 48) : Math.min(total, 22)
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
