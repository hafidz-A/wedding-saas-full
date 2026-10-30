/* ============================================================
   musi/engine/city.js — chapters 2–3: Palembang along the Musi.

   The river is one Catmull-Rom curve on the ground plane; everything is placed
   by (u along the river 0–1, side −1 left / +1 right of the boat, distance
   from the centre line). Landmarks, in the order the boat meets them
   (config/timeline.js LANDMARKS): Jembatan Ampera, Benteng Kuto Besak with its
   promenade, Masjid Agung, a row of Rumah Limas, floating rumah rakit, the LRT
   on its viaduct, pempek stalls and a kampung of stilt houses. No Pulau
   Kemaro pagoda (deliberately left out).

   Static parts are merged per material role (Kit); buildings, trees, lamps,
   boats, birds and the LRT train are instanced. Windows, lamps, lanterns and
   the Ampera lights glow with the night (materials.setNight).

   Each landmark is its own small group, pivoted on the ground, so it can POP
   UP when the boat has framed it (APPEAR in config/timeline.js): a jelly
   bounce, firm rather than floppy. Jembatan Ampera is built instead: its
   towers rise out of the river, then the deck grows out from both banks until
   the halves meet in the middle. Scrolling back past a landmark sinks it.
   ============================================================ */
import * as THREE from 'three'
import { APPEAR, LANDMARKS } from '../config/timeline.js'
import { Kit, ball, box, cone, cyl, frustum, instanced, rng, setInstance } from './kit.js'
import { addLimasHouse } from './limas.js'

export const HALF_W = 23 // river half-width
export const LAND_Y = 1.4
const UP = new THREE.Vector3(0, 1, 0)

const CONTROL = [
  [0, 0], [95, -12], [190, 14], [285, 2], [380, -28], [475, -18], [570, 12], [665, 2], [760, -24], [855, -12], [950, 0],
]

export function createRiver() {
  const curve = new THREE.CatmullRomCurve3(CONTROL.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, 'centripetal')
  const length = curve.getLength()
  const t0 = curve.getTangentAt(0)
  const t1 = curve.getTangentAt(1)
  const p0 = curve.getPointAt(0)
  const p1 = curve.getPointAt(1)
  const river = {
    curve,
    length,
    /** Centre of the river at u (extrapolated straight past both ends). */
    point(u, out = new THREE.Vector3()) {
      if (u < 0) return out.copy(p0).addScaledVector(t0, u * length)
      if (u > 1) return out.copy(p1).addScaledVector(t1, (u - 1) * length)
      return curve.getPointAt(u, out)
    },
    tangent(u, out = new THREE.Vector3()) {
      if (u <= 0) return out.copy(t0)
      if (u >= 1) return out.copy(t1)
      return curve.getTangentAt(u, out)
    },
    /** Unit vector to the boat's right (side +1) at u. */
    normal(u, out = new THREE.Vector3()) {
      const t = river.tangent(u, out)
      return out.set(-t.z, 0, t.x).normalize()
    },
    /** A point `d` from the centre line on `side`, at height y. */
    at(u, side, d, y = 0, out = new THREE.Vector3()) {
      const n = river.normal(u, new THREE.Vector3())
      return river.point(u, out).addScaledVector(n, side * d).setY(y)
    },
    /**
     * A placement matrix at (u, side, d): local +z faces the river, local x
     * runs along it, standing on the land (or on the water with y = 0).
     */
    frame(u, side, d, y = LAND_Y, s = 1) {
      const n = river.normal(u, new THREE.Vector3())
      const z = n.clone().multiplyScalar(-side)
      const x = new THREE.Vector3().crossVectors(UP, z)
      const m = new THREE.Matrix4().makeBasis(x, UP, z)
      m.scale(new THREE.Vector3(s, s, s))
      m.setPosition(river.at(u, side, d, y))
      return m
    },
  }
  return river
}

/** Window textures for the instanced buildings: walls (map) and lit windows (emissive). */
function windowTextures(rand) {
  const W = 64
  const H = 128
  const wall = document.createElement('canvas')
  const lit = document.createElement('canvas')
  wall.width = lit.width = W
  wall.height = lit.height = H
  const a = wall.getContext('2d')
  const b = lit.getContext('2d')
  a.fillStyle = '#ffffff'
  a.fillRect(0, 0, W, H)
  b.fillStyle = '#000000'
  b.fillRect(0, 0, W, H)
  // 4 columns × 8 rows of windows; the top band (v > 0.94) stays plain wall
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 4; c++) {
      const x = 4 + c * 15
      const y = 12 + r * 14.5
      a.fillStyle = '#3a3f4a'
      a.fillRect(x, y, 9, 9)
      const on = rand()
      if (on > 0.35) {
        b.fillStyle = on > 0.85 ? '#fff4dc' : on > 0.6 ? '#ffd89a' : '#ffc070'
        b.fillRect(x, y, 9, 9)
      }
    }
  }
  const mk = (cv) => {
    const t = new THREE.CanvasTexture(cv)
    t.colorSpace = THREE.SRGBColorSpace
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.magFilter = THREE.NearestFilter
    return t
  }
  return { wall: mk(wall), lit: mk(lit) }
}

/** A unit box (bottom at y = 0) whose side faces repeat the window grid. */
function buildingGeometry(cols, floors) {
  const g = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0)
  const uv = g.attributes.uv
  for (let i = 0; i < uv.count; i++) {
    const face = Math.floor(i / 4) // px, nx, py, ny, pz, nz
    if (face === 2 || face === 3) uv.setXY(i, 0.5, 0.97)
    else uv.setXY(i, uv.getX(i) * (cols / 4), uv.getY(i) * (floors / 8) * 0.92)
  }
  return g
}

const WALLS = ['#eadfc8', '#d9c6a5', '#f2e9d6', '#c9b79a', '#e3d3b8', '#cfc4b0', '#d7b49a', '#b8c9c6', '#e6cfc0', '#c2b19a']
const ROOFS = ['#9c4a32', '#b0573a', '#8a8f94', '#7a3a2a', '#a8a29a']

export function createCity(mats, quality, river) {
  const group = new THREE.Group()
  group.name = 'city'
  const rand = rng(1102)
  const kit = new Kit()
  const tmp = new THREE.Vector3()

  // ---------- land on both banks, embankments ----------
  const U0 = -0.4
  const U1 = 1.4
  for (const side of [-1, 1]) {
    const pts = []
    for (let i = 0; i <= 300; i++) {
      const u = U0 + ((U1 - U0) * i) / 300
      river.at(u, side, HALF_W, 0, tmp)
      pts.push([tmp.x, tmp.z])
    }
    const far = side * 760
    const shape = new THREE.Shape()
    shape.moveTo(pts[0][0], -pts[0][1])
    for (const [x, z] of pts) shape.lineTo(x, -z)
    shape.lineTo(pts[pts.length - 1][0], -far)
    shape.lineTo(pts[0][0], -far)
    shape.closePath()
    kit.add('ground', new THREE.ExtrudeGeometry(shape, { depth: LAND_Y, bevelEnabled: false, curveSegments: 1 }).rotateX(-Math.PI / 2))
    // stone embankment (talud) + a promenade strip along the water
    const bank = []
    const walk = []
    for (let i = 0; i <= 260; i++) {
      const u = -0.3 + (1.6 * i) / 260
      river.at(u, side, HALF_W + 1.2, 0, tmp)
      bank.push([tmp.x, tmp.z])
      river.at(u, side, HALF_W + 5.5, 0, tmp)
      walk.push([tmp.x, tmp.z])
    }
    kit.add('stone', ribbonOn(bank, 2.6), { p: [0, LAND_Y + 0.02, 0] })
    kit.add('path', ribbonOn(walk, 5.5), { p: [0, LAND_Y + 0.015, 0] })
  }

  // ---------- Jembatan Ampera (built from both banks) ----------
  // Built in the bridge's own frame: local x runs ALONG the river, local z
  // ACROSS it (z < 0 = right bank half, z > 0 = left bank half).
  const ampera = new THREE.Group()
  ampera.name = 'ampera'
  river.frame(LANDMARKS.ampera, 1, 0, 0).decompose(ampera.position, ampera.quaternion, ampera.scale)
  const HALF = 105
  const towersKit = new Kit()
  const halfKits = { '-1': new Kit(), 1: new Kit() }
  {
    for (const side of [-1, 1]) {
      const k = halfKits[side]
      const zc = side * HALF / 2
      k.add('ampera', box(9.5, 1.3, HALF), { p: [0, 9.6, zc] })
      k.add('asphalt', box(8.2, 0.12, HALF), { p: [0, 10.3, zc] })
      for (const s of [-1, 1]) {
        k.add('ampera', box(0.35, 0.9, HALF), { p: [s * 4.6, 10.7, zc] })
        k.add('led', box(0.12, 0.14, HALF), { p: [s * 4.85, 9.1, zc] })
      }
      for (const z of [30, 46, 62, 78, 94]) k.add('concrete', box(6, 9, 2.2), { p: [0, LAND_Y + 4, side * z] })
      // this half of the lifting span: a Warren truss on both sides
      for (const s of [-1, 1]) {
        k.add('ampera', box(0.5, 0.5, 16), { p: [s * 4.4, 14.2, side * 8] })
        for (let i = 0; i < 4; i++) {
          const z0 = side > 0 ? i * 4 : -16 + i * 4
          const dir = i % 2 ? 1 : -1
          k.add('ampera', box(0.35, Math.hypot(4, 4), 0.35), { p: [s * 4.4, 12.2, z0 + 2], r: [dir * Math.PI / 4, 0, 0] })
        }
      }
    }
    // the two towers standing in the river, with their crowns
    for (const tz of [-16, 16]) {
      for (const s of [-1, 1]) {
        towersKit.add('ampera', frustum(3.0, 2.6, 2.2, 2.0, 44), { p: [s * 4.2, 0, tz] })
        towersKit.add('ampera', frustum(2.6, 2.4, 0.4, 0.4, 3.2), { p: [s * 4.2, 44, tz] })
        towersKit.add('led', box(0.14, 40, 0.14), { p: [s * 5.6, 22, tz + 1.25] })
        towersKit.add('led', box(0.14, 40, 0.14), { p: [s * 5.6, 22, tz - 1.25] })
      }
      for (const y of [24, 34, 42]) towersKit.add('ampera', box(8.4, 1.6, 2.0), { p: [0, y, tz] })
      towersKit.add('led', box(8.6, 0.16, 0.16), { p: [0, 42.9, tz + 1.05] })
      towersKit.add('concrete', box(11, 2.4, 6), { p: [0, 0.6, tz] })
    }
  }
  const amperaTowers = new THREE.Group()
  towersKit.build(amperaTowers, mats)
  const amperaHalves = [-1, 1].map((side) => {
    // pivot at the bank end, so scaling z grows the deck toward the middle
    const g = new THREE.Group()
    halfKits[side].build(g, mats)
    for (const mesh of g.children) mesh.geometry.translate(0, 0, -side * HALF)
    g.position.z = side * HALF
    return g
  })
  ampera.add(amperaTowers, ...amperaHalves)
  group.add(ampera)

  // Landmarks that pop up: one Kit each, built later into a group pivoted on
  // the ground at `anchor` (see the pop-up section after kit.build).
  const popKits = []
  const landmark = (key, anchor) => {
    const k = new Kit()
    popKits.push({ key, kit: k, anchor })
    return k
  }

  // ---------- Benteng Kuto Besak + promenade ----------
  {
    const m = river.frame(LANDMARKS.kutoBesak, -1, 88)
    const lk = landmark('kutoBesak', river.at(LANDMARKS.kutoBesak, -1, 88, LAND_Y))
    const add = (role, geo, t = {}) => lk.add(role, geo, { ...t, m })
    const W = 92
    const D = 64
    add('fort', box(W, 8, 1.8), { p: [0, 4, D / 2] })
    add('fort', box(W, 8, 1.8), { p: [0, 4, -D / 2] })
    add('fort', box(1.8, 8, D), { p: [W / 2, 4, 0] })
    add('fort', box(1.8, 8, D), { p: [-W / 2, 4, 0] })
    for (let x = -W / 2 + 2; x < W / 2; x += 3) {
      add('fort', box(1.4, 1.1, 2), { p: [x, 8.5, D / 2] })
      add('fort', box(1.4, 1.1, 2), { p: [x, 8.5, -D / 2] })
    }
    for (let z = -D / 2 + 2; z < D / 2; z += 3) {
      add('fort', box(2, 1.1, 1.4), { p: [W / 2, 8.5, z] })
      add('fort', box(2, 1.1, 1.4), { p: [-W / 2, 8.5, z] })
    }
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        add('fort', box(10, 10, 10), { p: [sx * W / 2, 5, sz * D / 2], r: [0, Math.PI / 4, 0] })
        add('stone', box(10.6, 0.6, 10.6), { p: [sx * W / 2, 10.2, sz * D / 2], r: [0, Math.PI / 4, 0] })
      }
    }
    // the gate on the river side, with a pyramid roof and a gold trim
    add('plaster', box(15, 12, 8), { p: [0, 6, D / 2 + 1] })
    add('woodDark', box(4, 6, 0.4), { p: [0, 3, D / 2 + 5.1] })
    add('roof', frustum(17, 10, 2, 1, 6), { p: [0, 12, D / 2 + 1] })
    add('trim', box(17.2, 0.3, 0.3), { p: [0, 12.1, D / 2 + 6] })
    // buildings inside the walls
    for (const [x, z, w, d] of [[-22, -8, 26, 18], [20, -10, 30, 16], [0, 12, 22, 12]]) {
      add('white', box(w, 7, d), { p: [x, 3.5, z] })
      add('roof', frustum(w + 2, d + 2, w * 0.5, 0.6, 4), { p: [x, 7, z] })
    }
    // a wide paved plaza between the fort and the river (stays put)
    kit.add('stone', box(W + 40, 0.08, 28), { p: [0, 0.06, D / 2 + 14], m })
  }

  // ---------- Masjid Agung ----------
  {
    const m = river.frame(LANDMARKS.masjidAgung, -1, 100)
    const lk = landmark('masjidAgung', river.at(LANDMARKS.masjidAgung, -1, 100, LAND_Y))
    const add = (role, geo, t = {}) => lk.add(role, geo, { ...t, m })
    kit.add('stone', box(70, 0.1, 70), { p: [0, 0.06, 6], m })
    add('white', box(40, 9, 40), { p: [0, 4.5, 0] })
    for (let i = 0; i < 6; i++) {
      for (const s of [-1, 1]) {
        add('window', box(3, 4.5, 0.2), { p: [-15 + i * 6, 4, s * 20.05] })
        add('window', box(0.2, 4.5, 3), { p: [s * 20.05, 4, -15 + i * 6] })
      }
    }
    // three-tier (tumpang tiga) roof with simbar horns at every corner
    const tiers = [
      { y: 9, b: 46, t: 30, h: 5 },
      { y: 16, b: 32, t: 18, h: 5 },
      { y: 23, b: 20, t: 2, h: 8 },
    ]
    tiers.forEach((tr, i) => {
      add('mosqueRoof', frustum(tr.b, tr.b, tr.t, tr.t, tr.h), { p: [0, tr.y, 0] })
      add('trim', box(tr.b + 0.3, 0.3, 0.3), { p: [0, tr.y + 0.1, tr.b / 2] })
      add('trim', box(tr.b + 0.3, 0.3, 0.3), { p: [0, tr.y + 0.1, -tr.b / 2] })
      add('trim', box(0.3, 0.3, tr.b + 0.3), { p: [tr.b / 2, tr.y + 0.1, 0] })
      add('trim', box(0.3, 0.3, tr.b + 0.3), { p: [-tr.b / 2, tr.y + 0.1, 0] })
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          add('trim', cone(0.45, 2.4, 5), { p: [(sx * tr.b) / 2, tr.y + 1, (sz * tr.b) / 2], r: [sz * 0.5, 0, -sx * 0.5] })
        }
      }
      if (i < 2) add('white', box(tr.t, 2, tr.t), { p: [0, tr.y + tr.h + 1, 0] })
    })
    add('trim', cone(0.9, 4, 8), { p: [0, 33, 0] })
    add('trim', ball(0.9, 1), { p: [0, 31.2, 0] })
    // the minaret with its tiered cap
    const mx = -32
    const mz = 22
    add('white', cyl(3, 3.6, 34, 8), { p: [mx, 17, mz] })
    for (const y of [14, 26]) add('trim', cyl(4.2, 4.2, 0.5, 8), { p: [mx, y, mz] })
    add('mosqueRoof', frustum(8, 8, 4, 4, 3), { p: [mx, 34, mz] })
    add('mosqueRoof', frustum(5, 5, 0.5, 0.5, 4), { p: [mx, 37, mz] })
    add('trim', cone(0.5, 2.4, 6), { p: [mx, 42.2, mz] })
  }

  // ---------- a row of Rumah Limas on the right bank ----------
  {
    const lk = landmark('limasRow', river.at(LANDMARKS.limasRow, 1, 44, LAND_Y))
    for (let i = 0; i < 4; i++) {
      const u = LANDMARKS.limasRow - 0.036 + i * 0.024
      addLimasHouse(lk, river.frame(u, 1, 44, LAND_Y, 0.85), { lanterns: true })
    }
  }

  // ---------- rumah rakit: floating houses at the water's edge ----------
  const raftKit = landmark('rafts', river.at(LANDMARKS.rafts, 1, 17.5, 0))
  for (let i = 0; i < 6; i++) {
    const u = LANDMARKS.rafts - 0.02 + i * 0.0095
    const m = river.frame(u, 1, 17.5, 0)
    const add = (role, geo, t = {}) => raftKit.add(role, geo, { ...t, m })
    add('bamboo', box(8, 0.5, 6.2), { p: [0, 0.3, 0] })
    for (let k = -3.5; k <= 3.5; k += 0.7) add('woodLight', cyl(0.18, 0.18, 6.2, 6), { p: [k, 0.18, 0], r: [Math.PI / 2, 0, 0] })
    add(i % 2 ? 'woodLight' : 'wood', box(6, 2.6, 4.2), { p: [0, 1.85, -0.4] })
    add(i % 3 ? 'zinc' : 'thatch', frustum(7.2, 5.6, 6.4, 0.2, 1.8), { p: [0, 3.15, -0.4] })
    add('woodDark', box(1, 1.8, 0.08), { p: [0, 1.5, 1.73] })
    add('window', box(1.1, 0.8, 0.08), { p: [-2, 2.1, 1.73] })
    add('window', box(1.1, 0.8, 0.08), { p: [2, 2.1, 1.73] })
    add('lantern', cyl(0.18, 0.18, 0.36, 8), { p: [2.6, 2.7, 1.95] })
  }

  // ---------- LRT viaduct along the left bank ----------
  const lrtPath = []
  const lrtKit = landmark('lrt', river.at(LANDMARKS.lrt, -1, 46, LAND_Y))
  {
    const d = 46
    const y = 14
    let prev = null
    for (let u = 0.62; u <= 1.32; u += 0.018) {
      const p = river.at(u, -1, d, 0)
      add0('concrete', box(2.2, y - LAND_Y, 2.2), [p.x, LAND_Y + (y - LAND_Y) / 2, p.z])
      if (prev) {
        const mid = prev.clone().add(p).multiplyScalar(0.5)
        const len = prev.distanceTo(p)
        const ry = Math.atan2(-(p.z - prev.z), p.x - prev.x)
        lrtKit.add('concrete', box(len + 0.2, 1.6, 6.5), { p: [mid.x, y + 0.8, mid.z], r: [0, ry, 0] })
        lrtKit.add('stone', box(len + 0.2, 0.7, 0.3), { p: [mid.x, y + 1.9, mid.z], r: [0, ry, 0] })
      }
      lrtPath.push(new THREE.Vector3(p.x, y + 1.7, p.z))
      prev = p
    }
    // a station on the viaduct
    const sm = river.frame(LANDMARKS.lrt, -1, d, y + 1.6)
    lrtKit.add('concrete', box(34, 0.6, 14), { p: [0, 0, 0], m: sm })
    lrtKit.add('white', box(34, 4, 0.4), { p: [0, 2, -6.8], m: sm })
    lrtKit.add('zinc', frustum(36, 15, 30, 2, 2.4), { p: [0, 4.6, 0], m: sm })
    lrtKit.add('window', box(30, 1.2, 0.1), { p: [0, 2.4, -6.55], m: sm })
  }
  function add0(role, geo, p) {
    lrtKit.add(role, geo, { p })
  }

  // ---------- pempek stalls on the right bank ----------
  const pempekKit = landmark('pempek', river.at(LANDMARKS.pempek, 1, 31, LAND_Y))
  for (let i = 0; i < 6; i++) {
    const u = LANDMARKS.pempek - 0.02 + i * 0.008
    const m = river.frame(u, 1, 31)
    const add = (role, geo, t = {}) => pempekKit.add(role, geo, { ...t, m })
    add('woodLight', box(4, 1.1, 1.8), { p: [0, 0.55, 0] })
    add('cloth', box(4.1, 0.08, 1.9), { p: [0, 1.12, 0] })
    for (const sx of [-1.9, 1.9]) add('woodDark', cyl(0.06, 0.06, 2.6, 5), { p: [sx, 1.3, 0.9] })
    for (let k = 0; k < 4; k++) {
      add(k % 2 ? 'cloth' : 'awningA', box(1.05, 0.08, 2.4), { p: [-1.55 + k * 1.03, 2.55, 0.5], r: [-0.32, 0, 0] })
    }
    add('lantern', cyl(0.2, 0.2, 0.38, 8), { p: [0, 2.15, 1.6] })
    add('trim', cyl(0.8, 0.8, 0.1, 10), { p: [0.6, 0.75, 3.2] })
    add('woodDark', cyl(0.1, 0.1, 0.7, 5), { p: [0.6, 0.35, 3.2] })
  }

  // ---------- kampung of stilt houses ----------
  const kampungKit = landmark('kampung', river.at(LANDMARKS.kampung, 1, 50, LAND_Y))
  for (let i = 0; i < 12; i++) {
    const u = LANDMARKS.kampung - 0.035 + (i % 6) * 0.014 + rand() * 0.004
    const d = 40 + Math.floor(i / 6) * 22 + rand() * 6
    const m = river.frame(u, 1, d, LAND_Y, 0.9 + rand() * 0.2)
    const add = (role, geo, t = {}) => kampungKit.add(role, geo, { ...t, m })
    for (const sx of [-2.6, 0, 2.6]) {
      for (const sz of [-2, 2]) add('woodDark', cyl(0.14, 0.14, 1.8, 5), { p: [sx, 0.9, sz] })
    }
    add(i % 2 ? 'wood' : 'woodLight', box(6.4, 2.8, 5), { p: [0, 3.2, 0] })
    add(i % 3 ? 'roof' : 'zinc', frustum(7.6, 6.4, 7.0, 0.2, 2.4), { p: [0, 4.6, 0] })
    add('window', box(1, 0.9, 0.08), { p: [-1.6, 3.3, 2.52] })
    add('window', box(1, 0.9, 0.08), { p: [1.6, 3.3, 2.52] })
    add('trim', box(6.6, 0.12, 0.12), { p: [0, 1.85, 2.55] })
    if (i % 4 === 0) add('lantern', cyl(0.2, 0.2, 0.38, 8), { p: [2.8, 4.1, 2.8] })
  }

  // ---------- jetties with moored boats ----------
  for (const [u, side] of [[0.2, -1], [0.38, 1], [0.53, -1], [0.74, 1]]) {
    const m = river.frame(u, side, HALF_W - 4, 0)
    kit.add('woodDark', box(3, 0.3, 9), { p: [0, 1.1, 0], m })
    for (const z of [-4, 0, 4]) kit.add('woodDark', cyl(0.14, 0.14, 2.2, 5), { p: [1.4, 0.4, z], m })
    kit.add('wood', box(1.4, 0.6, 7), { p: [3.2, 0.3, -1], m })
  }

  kit.build(group, mats, { receive: false })

  // ---------- landmark groups, pivoted on the ground ----------
  const pops = popKits.map(({ key, kit: k, anchor }) => {
    const g = new THREE.Group()
    g.name = key
    k.build(g, mats)
    for (const mesh of g.children) {
      mesh.geometry.translate(-anchor.x, -anchor.y, -anchor.z)
      mesh.geometry.computeBoundingSphere()
    }
    g.position.copy(anchor)
    group.add(g)
    return { key, group: g, kind: 'pop', raised: false, since: -1e9 }
  })
  pops.unshift({ key: 'ampera', group: ampera, kind: 'ampera', raised: false, since: -1e9 })

  // ---------- water ----------
  const water = new THREE.Mesh(new THREE.PlaneGeometry(2400, 1700, 120, 60).rotateX(-Math.PI / 2), mats.get('water'))
  water.position.set(460, 0.15, 0)
  group.add(water)

  // ---------- instanced buildings ----------
  const tex = windowTextures(rand)
  const bMat = new THREE.MeshStandardMaterial({
    map: tex.wall,
    emissiveMap: tex.lit,
    emissive: new THREE.Color('#ffd9a0'),
    emissiveIntensity: 0,
    roughness: 0.9,
    flatShading: true,
  })
  const total = quality === 'high' ? 1300 : quality === 'medium' ? 820 : 460
  const classes = [
    { share: 0.55, geo: buildingGeometry(3, 3), w: [7, 14], h: [4, 9] },
    { share: 0.35, geo: buildingGeometry(4, 6), w: [8, 16], h: [10, 22] },
    { share: 0.1, geo: buildingGeometry(4, 14), w: [12, 20], h: [26, 58] },
  ]
  const keepOut = [
    { u: LANDMARKS.ampera, side: 0, du: 0.012, d0: 0, d1: 120 },
    { u: LANDMARKS.kutoBesak, side: -1, du: 0.07, d0: 0, d1: 128 },
    { u: LANDMARKS.masjidAgung, side: -1, du: 0.055, d0: 0, d1: 140 },
    { u: LANDMARKS.limasRow, side: 1, du: 0.06, d0: 0, d1: 66 },
    { u: LANDMARKS.pempek, side: 1, du: 0.03, d0: 0, d1: 40 },
    { u: LANDMARKS.kampung, side: 1, du: 0.06, d0: 0, d1: 96 },
    { u: 0.97, side: -1, du: 0.36, d0: 36, d1: 56 }, // the LRT corridor
  ]
  const blocked = (u, side, d, w) =>
    keepOut.some((k) => (k.side === 0 || k.side === side) && Math.abs(u - k.u) < k.du + w / river.length && d > k.d0 - w && d < k.d1 + w)
  const col = new THREE.Color()
  const bMeshes = classes.map((c) => {
    const n = Math.round(total * c.share)
    const mesh = new THREE.InstancedMesh(c.geo, bMat, n)
    mesh.frustumCulled = false
    let i = 0
    let tries = 0
    while (i < n && tries < n * 20) {
      tries++
      const side = rand() < 0.5 ? -1 : 1
      const u = -0.3 + rand() * 1.6
      const near = c.h[1] > 30 ? 120 : 34
      const d = near + Math.pow(rand(), 1.5) * (560 - near)
      const w = c.w[0] + rand() * (c.w[1] - c.w[0])
      if (blocked(u, side, d, w)) continue
      const p = river.at(u, side, d, LAND_Y, tmp)
      const t = river.tangent(u, new THREE.Vector3())
      const h = c.h[0] + rand() * (c.h[1] - c.h[0])
      setInstance(mesh, i, [p.x, p.y, p.z], [0, Math.atan2(-t.z, t.x) + (rand() - 0.5) * 0.2, 0], [w, h, w * (0.7 + rand() * 0.6)])
      mesh.setColorAt(i, col.set(WALLS[Math.floor(rand() * WALLS.length)]))
      i++
    }
    mesh.count = i
    mesh.userData.full = i
    group.add(mesh)
    return mesh
  })
  // pitched roofs on the low class (terracotta and zinc, as seen from the sky)
  const low = bMeshes[0]
  const roofMesh = new THREE.InstancedMesh(frustumUnit(), new THREE.MeshStandardMaterial({ roughness: 0.8, flatShading: true }), low.count)
  roofMesh.frustumCulled = false
  {
    const mm = new THREE.Matrix4()
    const pos = new THREE.Vector3()
    const q = new THREE.Quaternion()
    const sc = new THREE.Vector3()
    for (let i = 0; i < low.count; i++) {
      low.getMatrixAt(i, mm)
      mm.decompose(pos, q, sc)
      pos.y += sc.y
      sc.set(sc.x * 1.08, Math.min(3.5, sc.x * 0.32), sc.z * 1.08)
      roofMesh.setMatrixAt(i, mm.compose(pos, q, sc))
      roofMesh.setColorAt(i, col.set(ROOFS[Math.floor(rand() * ROOFS.length)]))
    }
    roofMesh.userData.full = low.count
  }
  group.add(roofMesh)

  // ---------- trees and lamps along the banks ----------
  const nTrees = quality === 'high' ? 360 : quality === 'medium' ? 240 : 130
  const trunks = instanced(cyl(0.25, 0.35, 3, 5).translate(0, 1.5, 0), mats.get('trunk'), nTrees)
  const crowns = instanced(ball(1.9, 0).translate(0, 4.2, 0), new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true }), nTrees)
  {
    let i = 0
    let tries = 0
    while (i < nTrees && tries < nTrees * 20) {
      tries++
      const side = rand() < 0.5 ? -1 : 1
      const u = -0.25 + rand() * 1.5
      const d = rand() < 0.6 ? HALF_W + 9 + rand() * 4 : 40 + rand() * 300
      if (blocked(u, side, d, 2)) continue
      const p = river.at(u, side, d, LAND_Y, tmp)
      const s = 0.8 + rand() * 0.7
      setInstance(trunks, i, [p.x, p.y, p.z], [0, rand() * 6, 0], s)
      setInstance(crowns, i, [p.x, p.y, p.z], [rand(), rand() * 6, 0], s)
      crowns.setColorAt(i, col.set(rand() < 0.5 ? '#5f8f4e' : '#3f6b3a'))
      i++
    }
    trunks.count = crowns.count = i
  }
  group.add(trunks, crowns)

  const nLamps = 2 * 90
  const posts = instanced(cyl(0.08, 0.1, 4, 5).translate(0, 2, 0), mats.get('dark'), nLamps)
  const heads = instanced(ball(0.32, 0).translate(0, 4.1, 0), mats.get('lamp'), nLamps)
  {
    let i = 0
    for (const side of [-1, 1]) {
      for (let k = 0; k < 90; k++) {
        const u = -0.05 + (k / 90) * 1.1
        if (Math.abs(u - LANDMARKS.ampera) < 0.01) continue
        const p = river.at(u, side, HALF_W + 2.4, LAND_Y, tmp)
        setInstance(posts, i, [p.x, p.y, p.z])
        setInstance(heads, i, [p.x, p.y, p.z])
        i++
      }
    }
    posts.count = heads.count = i
  }
  group.add(posts, heads)

  // ---------- boats on the river (ketek), the LRT train, birds ----------
  const nBoats = quality === 'low' ? 8 : 16
  const hullGeo = new THREE.BufferGeometry()
  {
    const k = new Kit()
    k.add('h', box(1.4, 0.5, 6.4), { p: [0, 0.25, 0] })
    k.add('h', cone(0.7, 1.6, 4), { p: [0, 0.25, 4], r: [Math.PI / 2, Math.PI / 4, 0], s: [1, 1, 0.5] })
    const tmpGroup = new THREE.Group()
    k.build(tmpGroup, { get: () => null })
    hullGeo.copy(tmpGroup.children[0].geometry)
    tmpGroup.children[0].geometry.dispose()
  }
  const hulls = instanced(hullGeo, new THREE.MeshStandardMaterial({ roughness: 0.8, flatShading: true }), nBoats)
  const cabins = instanced(box(1.3, 1.1, 2.4).translate(0, 1.05, -0.6), new THREE.MeshStandardMaterial({ roughness: 0.7, flatShading: true }), nBoats)
  const boatState = []
  for (let i = 0; i < nBoats; i++) {
    const dir = i % 2 ? 1 : -1
    boatState.push({
      u: rand(),
      lane: dir * (8 + rand() * 9),
      speed: dir * (0.004 + rand() * 0.007),
      phase: rand() * 6,
    })
    hulls.setColorAt(i, col.set(['#6b3f24', '#8a5a2e', '#3f5f7a', '#7a2a2a'][i % 4]))
    cabins.setColorAt(i, col.set(['#2f6b52', '#d6a43a', '#3f6fa8', '#c8443a', '#f1e6cf'][i % 5]))
  }
  group.add(hulls, cabins)

  const train = instanced(box(3.2, 3.2, 15).translate(0, 1.6, 0), mats.get('train'), 3)
  const trainWin = instanced(box(3.3, 0.9, 13).translate(0, 2.2, 0), mats.get('window'), 3)
  group.add(train, trainWin)
  const lrtLen = []
  {
    let acc = 0
    lrtLen.push(0)
    for (let i = 1; i < lrtPath.length; i++) {
      acc += lrtPath[i].distanceTo(lrtPath[i - 1])
      lrtLen.push(acc)
    }
  }
  const lrtTotal = lrtLen[lrtLen.length - 1]
  const lrtPoint = (s, out) => {
    const x = ((s % lrtTotal) + lrtTotal) % lrtTotal
    let i = 1
    while (i < lrtLen.length - 1 && lrtLen[i] < x) i++
    const k = (x - lrtLen[i - 1]) / (lrtLen[i] - lrtLen[i - 1] || 1)
    return out.copy(lrtPath[i - 1]).lerp(lrtPath[i], k)
  }

  const nBirds = quality === 'low' ? 10 : 22
  const birdGeo = new THREE.BufferGeometry()
  {
    const k = new Kit()
    k.add('b', box(1.1, 0.06, 0.3), { p: [0.5, 0, 0], r: [0, 0, 0.35] })
    k.add('b', box(1.1, 0.06, 0.3), { p: [-0.5, 0, 0], r: [0, 0, -0.35] })
    const g = new THREE.Group()
    k.build(g, { get: () => null })
    birdGeo.copy(g.children[0].geometry)
    g.children[0].geometry.dispose()
  }
  const birds = instanced(birdGeo, mats.get('dark'), nBirds)
  group.add(birds)

  // ---------- our own boat: a decorated perahu the camera rides on ----------
  const boat = new THREE.Group()
  {
    const k = new Kit()
    k.add('wood', box(2.6, 0.5, 7), { p: [0, 0.25, 0] })
    k.add('wood', cone(1.3, 2.6, 4), { p: [0, 0.25, 4.7], r: [Math.PI / 2, Math.PI / 4, 0], s: [1, 1, 0.38] })
    k.add('woodLight', box(2.2, 0.08, 6.6), { p: [0, 0.52, 0.2] })
    for (const s of [-1, 1]) {
      k.add('trim', box(0.12, 0.12, 7.2), { p: [s * 1.3, 0.6, 0.3] })
      k.add('woodDark', cyl(0.04, 0.04, 0.6, 5), { p: [s * 1.15, 0.85, 4.0] })
      k.add('lantern', cyl(0.1, 0.1, 0.2, 8), { p: [s * 1.15, 1.2, 4.0] })
      k.add('trim', cyl(0.06, 0.1, 0.04, 8), { p: [s * 1.15, 1.32, 4.0] })
    }
    k.add('songket', box(2.4, 0.06, 0.6), { p: [0, 0.58, 4.2] })
    k.build(boat, mats)
  }
  group.add(boat)

  // where each landmark is, for the camera to glance at
  const focus = {
    ampera: river.at(LANDMARKS.ampera, 1, 0, 30),
    kutoBesak: river.at(LANDMARKS.kutoBesak, -1, 64, 8),
    masjidAgung: river.at(LANDMARKS.masjidAgung, -1, 100, 18),
    limasRow: river.at(LANDMARKS.limasRow, 1, 44, 7),
    rafts: river.at(LANDMARKS.rafts, 1, 17.5, 2.5),
    lrt: river.at(LANDMARKS.lrt, -1, 46, 15),
    pempek: river.at(LANDMARKS.pempek, 1, 31, 2.5),
    kampung: river.at(LANDMARKS.kampung, 1, 52, 5),
  }

  const m4 = new THREE.Matrix4()
  const qv = new THREE.Quaternion()
  const pv = new THREE.Vector3()
  const tv = new THREE.Vector3()
  const sv = new THREE.Vector3(1, 1, 1)
  let trainS = 0

  // ---------- landmark pop-ups ----------
  // A firm jelly: ~20% overshoot, settled in well under a second.
  const ZETA = 0.45
  const OMEGA = 13
  const OMEGA_D = OMEGA * Math.sqrt(1 - ZETA * ZETA)
  const jelly = (t) => (t <= 0 ? 0 : 1 - Math.exp(-ZETA * OMEGA * t) * Math.cos(OMEGA_D * t))
  const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t))
  const easeOut = (t) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3)
  // only compact landmarks squash sideways (a wide row would visibly slide)
  const SQUASH = { kutoBesak: 0.25, masjidAgung: 0.25 }
  const DECK_AT = 0.45 // seconds after the towers start, the deck starts growing
  const DECK_TIME = 1.0
  for (const pop of pops) {
    pop.prog = 0
    pop.group.visible = false
  }
  function animatePops(dt, T, reduce) {
    for (const pop of pops) {
      const up = T >= APPEAR[pop.key]
      if (up !== pop.raised) {
        pop.raised = up
        // going down starts from (at most) the end of the build
        if (!up) pop.prog = Math.min(pop.prog, pop.kind === 'ampera' ? DECK_AT + DECK_TIME + 0.3 : 0.6)
      }
      if (reduce) pop.prog = up ? 9 : 0
      else pop.prog = up ? pop.prog + dt : Math.max(0, pop.prog - dt * 2.5)
      const t = pop.prog
      const g = pop.group
      if (pop.kind === 'ampera') {
        const towers = up && !reduce ? jelly(t) : smooth(t / 0.6)
        const deck = easeOut((t - DECK_AT) / DECK_TIME)
        amperaTowers.scale.set(1, Math.max(1e-4, towers), 1)
        for (const h of amperaHalves) {
          h.scale.z = Math.max(1e-4, deck)
          h.visible = deck > 0.002
        }
        // the halves meet: a small jelly shiver through the whole bridge
        const k = t - DECK_AT - DECK_TIME
        g.scale.y = up && !reduce && k > 0 ? 1 + 0.05 * Math.exp(-5 * k) * Math.sin(16 * k) : 1
        g.visible = towers > 0.002
      } else {
        const sy = up && !reduce ? jelly(t) : smooth(t / 0.5)
        const sq = SQUASH[pop.key] || 0
        const sxz = Math.min(1.2, Math.max(0.88, 1 + (1 - sy) * sq))
        g.scale.set(sxz, Math.max(1e-4, sy), sxz)
        g.visible = sy > 0.002
      }
    }
    const lrt = pops.find((x) => x.key === 'lrt')
    train.visible = trainWin.visible = lrt.group.visible && lrt.group.scale.y > 0.95
  }

  function update(dt, time, night, reduce, T = 1) {
    animatePops(dt, T, reduce)
    const go = reduce ? 0 : dt
    // boats
    for (let i = 0; i < boatState.length; i++) {
      const b = boatState[i]
      b.u += (b.speed * go * 950) / river.length
      if (b.u > 1.1) b.u = -0.1
      if (b.u < -0.1) b.u = 1.1
      const p = river.at(b.u, Math.sign(b.lane), Math.abs(b.lane), 0.2 + Math.sin(time * 1.6 + b.phase) * 0.06, pv)
      const t = river.tangent(b.u, tv)
      const ry = Math.atan2(t.x, t.z) + (b.speed < 0 ? Math.PI : 0)
      setInstance(hulls, i, [p.x, p.y, p.z], [0, ry, Math.sin(time * 1.3 + b.phase) * 0.04])
      setInstance(cabins, i, [p.x, p.y, p.z], [0, ry, Math.sin(time * 1.3 + b.phase) * 0.04])
    }
    hulls.instanceMatrix.needsUpdate = cabins.instanceMatrix.needsUpdate = true
    // LRT: three cars running along the viaduct
    trainS += go * 16
    for (let c = 0; c < 3; c++) {
      const s = trainS - c * 15.6
      const a = lrtPoint(s - 7, pv)
      const b = lrtPoint(s + 7, tv)
      const mid = a.clone().add(b).multiplyScalar(0.5)
      qv.setFromAxisAngle(UP, Math.atan2(b.x - a.x, b.z - a.z))
      m4.compose(mid, qv, sv)
      train.setMatrixAt(c, m4)
      trainWin.setMatrixAt(c, m4)
    }
    train.instanceMatrix.needsUpdate = trainWin.instanceMatrix.needsUpdate = true
    // birds: a few flocks circling over the river by day, gone at night
    const nb = Math.round(nBirds * Math.max(0, 1 - night * 1.4))
    birds.count = nb
    for (let i = 0; i < nb; i++) {
      const flock = i % 3
      const a = time * (0.25 + flock * 0.05) + (i / nBirds) * 6.28
      const c = river.at(0.12 + flock * 0.28, 0, 0, 0, pv)
      setInstance(birds, i, [c.x + Math.cos(a) * (40 + flock * 12), 26 + flock * 6 + Math.sin(a * 3) * 2, c.z + Math.sin(a) * 30], [0, -a, Math.sin(time * 9 + i) * 0.35], 1.4)
    }
    birds.instanceMatrix.needsUpdate = true
    bMat.emissiveIntensity = night * 1.25
  }
  update(0, 0, 0, true, 0)

  return {
    group,
    boat,
    focus,
    update,
    setQuality(q) {
      const f = q === 'high' ? 1 : q === 'medium' ? 0.65 : 0.38
      for (const mesh of bMeshes) mesh.count = Math.round(mesh.userData.full * f)
      roofMesh.count = bMeshes[0].count
    },
    dispose() {
      group.traverse((o) => {
        if (o.isMesh) o.geometry.dispose()
      })
      bMat.dispose()
      tex.wall.dispose()
      tex.lit.dispose()
      roofMesh.material.dispose()
      crowns.material.dispose()
      hulls.material.dispose()
      cabins.material.dispose()
    },
  }
}

/** A flat ribbon over [x, z] points — local copy (the kit's is for map lines). */
function ribbonOn(points, w) {
  const tri = []
  for (let i = 0; i < points.length - 1; i++) {
    const [ax, az] = points[i]
    const [bx, bz] = points[i + 1]
    let dx = bx - ax
    let dz = bz - az
    const l = Math.hypot(dx, dz) || 1
    dx /= l
    dz /= l
    const ox = -dz * w * 0.5
    const oz = dx * w * 0.5
    const l0 = [ax + ox, 0, az + oz]
    const r0 = [ax - ox, 0, az - oz]
    const l1 = [bx + ox, 0, bz + oz]
    const r1 = [bx - ox, 0, bz - oz]
    tri.push(l0, r1, r0, l0, l1, r1)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(tri.flat(), 3))
  geo.computeVertexNormals()
  return geo
}

/** A unit hip roof (base 1 × 1 at y = 0, ridge along x). */
function frustumUnit() {
  return frustum(1, 1, 0.55, 0.02, 1)
}
