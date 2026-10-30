/* ============================================================
   musi/engine/kit.js — shared materials + a geometry merger.

   Everything in the scene is built from primitives. To stay far under the
   draw-call budget, static parts are not added as separate meshes: they are
   collected per material ROLE (wood, roof, trim, …) and merged into one mesh
   per role per scene group (Kit.build). Moving things (people, boats, birds,
   the LRT train) use InstancedMesh instead.

   Roles marked `palette` take their colour from the chosen palette (the Limas
   roof, gold trim, songket, lanterns, warm lights), so switching palettes
   recolours the merged meshes in place — no rebuild.
   ============================================================ */
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

/** Fixed colours (the same in every palette). */
const FIXED = {
  wood: '#6b3f24',
  woodDark: '#43261a',
  woodLight: '#9a6a3e',
  cream: '#f1e6cf',
  white: '#f2eee6',
  plaster: '#e6d6b4',
  fort: '#d9b98a',
  leaf: '#5f8f4e',
  leafDark: '#3f6b3a',
  trunk: '#5a3d26',
  grass: '#79a35a',
  path: '#dccaa2',
  stone: '#b9b2a6',
  concrete: '#c9c2b5',
  asphalt: '#55545a',
  ground: '#768a55', // city land reads green against the brown Musi
  sand: '#d8c48e',
  land: '#7fa65c',
  mountain: '#4f7a45',
  ampera: '#b0262b',
  mosqueRoof: '#3d5a4c',
  zinc: '#8a8f94',
  thatch: '#8a6a3e',
  bamboo: '#c2a065',
  dark: '#2a2224',
  cloth: '#f6efe2',
  awningA: '#c8443a',
  train: '#e9ecef',
  skin: '#c58c5f',
}

/** Roles whose colour comes from the palette (`scene` block of config/palettes.js). */
const PALETTE_ROLES = { roof: 'roof', trim: 'trim', songket: 'songket' }

/** Roles that glow; intensity follows the night (setNight) unless `always`. */
const GLOW = {
  lantern: { key: 'lantern', day: 0.35, night: 1.6 },
  lamp: { key: 'light', day: 0.05, night: 2.2 },
  window: { key: 'light', day: 0.0, night: 1.4 },
  led: { key: 'trim', day: 0.0, night: 2.6 },
  door: { key: 'light', day: 1.6, night: 1.8, always: true },
}

export function createMaterials(palette) {
  const mats = {}
  const std = (color, extra = {}) =>
    new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.02, flatShading: true, ...extra })
  for (const [role, color] of Object.entries(FIXED)) mats[role] = std(color)
  mats.trim = std(palette.scene.trim, { roughness: 0.45, metalness: 0.55 })
  mats.roof = std(palette.scene.roof, { roughness: 0.7 })
  mats.songket = std(palette.scene.songket, { roughness: 0.6, metalness: 0.15 })
  mats.ampera.roughness = 0.6
  for (const [role, g] of Object.entries(GLOW)) {
    const c = role === 'window' || role === 'lamp' || role === 'door' ? '#3a3026' : palette.scene[g.key]
    mats[role] = std(c, { emissive: new THREE.Color(palette.scene[g.key]), emissiveIntensity: g.day, roughness: 0.6 })
  }
  // the Musi is brown; at night it takes a faint blue sheen so it still
  // reads as water next to the dark land
  mats.water = std('#8f7148', { roughness: 0.22, metalness: 0.3, emissive: new THREE.Color('#1c2a52'), emissiveIntensity: 0 })
  mats.sea = std('#2f7fae', { roughness: 0.3, metalness: 0.1 })

  return {
    get: (role) => mats[role] || mats.wood,
    all: mats,
    setPalette(p) {
      for (const [role, key] of Object.entries(PALETTE_ROLES)) mats[role].color.set(p.scene[key])
      for (const [role, g] of Object.entries(GLOW)) {
        mats[role].emissive.set(p.scene[g.key])
        if (role === 'lantern' || role === 'led') mats[role].color.set(p.scene[g.key])
      }
    },
    setNight(n) {
      for (const [role, g] of Object.entries(GLOW)) mats[role].emissiveIntensity = g.day + (g.night - g.day) * n
      mats.water.emissiveIntensity = n * 0.55
    },
    dispose() {
      for (const m of Object.values(mats)) m.dispose()
    },
  }
}

const _m = new THREE.Matrix4()
const _q = new THREE.Quaternion()
const _e = new THREE.Euler()
const _s = new THREE.Vector3()
const _p = new THREE.Vector3()

/** Normalise a geometry for merging: non-indexed, position + normal only. */
function prep(geo) {
  let g = geo.index ? geo.toNonIndexed() : geo
  if (g !== geo) geo.dispose()
  for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal') g.deleteAttribute(name)
  if (!g.attributes.normal) g.computeVertexNormals()
  return g
}

export class Kit {
  constructor() {
    this.parts = new Map()
  }

  /**
   * Add a geometry under a material role.
   * t: { p: [x,y,z], r: [rx,ry,rz], s: [sx,sy,sz] | number, m: Matrix4 (applied after) }
   */
  add(role, geo, t = {}) {
    const g = prep(geo)
    const s = t.s == null ? 1 : t.s
    _p.fromArray(t.p || [0, 0, 0])
    _q.setFromEuler(_e.set(...(t.r || [0, 0, 0])))
    if (typeof s === 'number') _s.set(s, s, s)
    else _s.fromArray(s)
    g.applyMatrix4(_m.compose(_p, _q, _s))
    if (t.m) g.applyMatrix4(t.m)
    if (!this.parts.has(role)) this.parts.set(role, [])
    this.parts.get(role).push(g)
    return this
  }

  /** Merge every role into one mesh, add them to `parent`. */
  build(parent, mats, { cast = false, receive = false, noCast = [] } = {}) {
    const meshes = []
    for (const [role, geos] of this.parts) {
      const merged = mergeGeometries(geos, false)
      for (const g of geos) g.dispose()
      if (!merged) continue
      merged.computeBoundingSphere()
      const mesh = new THREE.Mesh(merged, mats.get(role))
      mesh.castShadow = cast && !noCast.includes(role)
      mesh.receiveShadow = receive
      mesh.matrixAutoUpdate = false
      mesh.updateMatrix()
      mesh.name = role
      parent.add(mesh)
      meshes.push(mesh)
    }
    this.parts.clear()
    return meshes
  }
}

/* ---------- primitive helpers ---------- */

export const box = (w, h, d) => new THREE.BoxGeometry(w, h, d)
export const cyl = (rt, rb, h, seg = 8) => new THREE.CylinderGeometry(rt, rb, h, seg, 1)
export const cone = (r, h, seg = 8) => new THREE.ConeGeometry(r, h, seg, 1)
export const ball = (r, d = 1) => new THREE.IcosahedronGeometry(r, d)

/**
 * A four-sided frustum from a bottom rectangle (bw × bd) to a top rectangle
 * (tw × td), height h, base at y = 0. With tw or td = 0 it is a ridge/pyramid —
 * the shape of a limas roof tier.
 */
export function frustum(bw, bd, tw, td, h, cap = true) {
  const b = [
    [-bw / 2, 0, -bd / 2], [bw / 2, 0, -bd / 2], [bw / 2, 0, bd / 2], [-bw / 2, 0, bd / 2],
  ]
  const t = [
    [-tw / 2, h, -td / 2], [tw / 2, h, -td / 2], [tw / 2, h, td / 2], [-tw / 2, h, td / 2],
  ]
  const tri = []
  const quad = (a, c, d, e) => tri.push(a, c, d, a, d, e)
  quad(b[0], t[0], t[1], b[1])
  quad(b[1], t[1], t[2], b[2])
  quad(b[2], t[2], t[3], b[3])
  quad(b[3], t[3], t[0], b[0])
  if (cap && tw > 0 && td > 0) quad(t[0], t[3], t[2], t[1])
  quad(b[0], b[1], b[2], b[3])
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(tri.flat(), 3))
  geo.computeVertexNormals()
  return geo
}

/** A flat ribbon along a polyline of [x, z] points (y = 0), `w` wide. */
export function ribbon(points, w, closed = false) {
  const pts = closed ? [...points, points[0], points[1]] : points
  const tri = []
  const side = []
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)]
    const c = pts[Math.min(pts.length - 1, i + 1)]
    let dx = c[0] - a[0]
    let dz = c[1] - a[1]
    const l = Math.hypot(dx, dz) || 1
    dx /= l
    dz /= l
    side.push([
      [pts[i][0] - dz * w * 0.5, 0, pts[i][1] + dx * w * 0.5],
      [pts[i][0] + dz * w * 0.5, 0, pts[i][1] - dx * w * 0.5],
    ])
  }
  const end = closed ? side.length - 1 : side.length
  for (let i = 0; i < end - 1; i++) {
    const [l0, r0] = side[i]
    const [l1, r1] = side[i + 1]
    // wound counter-clockwise seen from above, so the ribbon faces up
    tri.push(l0, r1, r0, l0, l1, r1)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(tri.flat(), 3))
  geo.computeVertexNormals()
  return geo
}

/** Deterministic random (so every guest sees the same city). */
export function rng(seed = 1) {
  let s = seed >>> 0 || 1
  return () => {
    s ^= s << 13
    s ^= s >>> 17
    s ^= s << 5
    return ((s >>> 0) % 100000) / 100000
  }
}

/** InstancedMesh helper with per-instance colour. */
export function instanced(geo, mat, count, { cast = false, receive = false } = {}) {
  const g = prep(geo)
  const mesh = new THREE.InstancedMesh(g, mat, Math.max(1, count))
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  mesh.castShadow = cast
  mesh.receiveShadow = receive
  mesh.frustumCulled = false
  return mesh
}

export function setInstance(mesh, i, p, r = [0, 0, 0], s = 1) {
  _p.fromArray(p)
  _q.setFromEuler(_e.set(r[0], r[1], r[2]))
  if (typeof s === 'number') _s.set(s, s, s)
  else _s.fromArray(s)
  mesh.setMatrixAt(i, _m.compose(_p, _q, _s))
}
