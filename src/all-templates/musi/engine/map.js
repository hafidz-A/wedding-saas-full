/* ============================================================
   musi/engine/map.js — chapter 1: the flight over South Sumatra.

   Low-poly islands extruded from the coastlines in config/geo.js on a rippling
   sea, the Bukit Barisan range, the Musi drawn to the coast, South Sumatra
   lighting up with a gold outline that draws itself, a pin over Palembang, and
   a layer of clouds the camera dives through on its way down to the river.

   Projection: Palembang is the origin, K units per degree, north = −z.
   ============================================================ */
import * as THREE from 'three'
import { ISLANDS, MUSI_LINE, PALEMBANG, RIDGE, SUMATRA, SUMSEL } from '../config/geo.js'
import { Kit, ball, cone, ribbon, rng } from './kit.js'

export const K = 5
const LAND_H = 0.8

/** [lon, lat] → [x, z] in map space. */
export const project = ([lon, lat]) => [(lon - PALEMBANG[0]) * K, -(lat - PALEMBANG[1]) * K]

function shapeOf(points) {
  // shape space is (x, −z): rotateX(−π/2) maps it back to (x, 0, z)
  const shape = new THREE.Shape()
  points.forEach((pt, i) => {
    const [x, z] = project(pt)
    if (i === 0) shape.moveTo(x, -z)
    else shape.lineTo(x, -z)
  })
  shape.closePath()
  return shape
}

export function createMap(mats, quality) {
  const group = new THREE.Group()
  group.name = 'map'
  const rand = rng(1945)
  const kit = new Kit()

  // sea
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(900, 900, 48, 48).rotateX(-Math.PI / 2), mats.get('sea'))
  sea.position.set(-20, 0, -10)
  sea.receiveShadow = false
  group.add(sea)

  // islands: sandy extruded sides + a green top
  for (const poly of [SUMATRA, ...ISLANDS]) {
    const shape = shapeOf(poly)
    kit.add('sand', new THREE.ExtrudeGeometry(shape, { depth: LAND_H, bevelEnabled: false }).rotateX(-Math.PI / 2))
    kit.add('land', new THREE.ShapeGeometry(shape).rotateX(-Math.PI / 2), { p: [0, LAND_H + 0.01, 0] })
  }

  // Bukit Barisan: cones sampled along the ridge line
  for (let i = 0; i < RIDGE.length - 1; i++) {
    const [ax, az] = project(RIDGE[i])
    const [bx, bz] = project(RIDGE[i + 1])
    const steps = 4
    for (let k = 0; k < steps; k++) {
      const t = (k + rand() * 0.6) / steps
      const r = 1.3 + rand() * 1.6
      kit.add(rand() < 0.3 ? 'leafDark' : 'mountain', cone(r, 1.6 + rand() * 3.2, 5), {
        p: [ax + (bx - ax) * t + (rand() - 0.5) * 2, LAND_H + 1.2, az + (bz - az) * t + (rand() - 0.5) * 2],
        r: [0, rand() * 6, 0],
      })
    }
  }
  // a few volcanoes along Java
  for (const lon of [106.9, 107.7, 109.2, 110.4, 112.3, 113.5]) {
    const [x, z] = project([lon, -7.2])
    kit.add('mountain', cone(1.6, 3 + rand() * 1.5, 5), { p: [x, LAND_H + 1.4, z] })
  }

  // the Musi to the sea
  kit.add('water', ribbon(MUSI_LINE.map(project), 0.42), { p: [0, LAND_H + 0.03, 0] })

  // clouds: a high layer over the map and a thick bank over Palembang (the dive)
  const cloudMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, flatShading: true, transparent: true, opacity: 0.94 })
  const clouds = new THREE.Group()
  const ckit = new Kit()
  const cloud = (x, y, z, s) => {
    const n = 3 + Math.floor(rand() * 3)
    for (let i = 0; i < n; i++) {
      ckit.add('cloud', ball(s * (0.8 + rand() * 0.6), 0), {
        p: [x + (i - n / 2) * s * 1.1, y + rand() * s * 0.4, z + (rand() - 0.5) * s],
        s: [1.2, 0.7, 1],
      })
    }
  }
  // high clouds stay off Sumatra's south (the view the flight is about);
  // the low bank only fills the dive over Palembang at the very end
  const nHigh = quality === 'low' ? 7 : 12
  for (let i = 0; i < nHigh; i++) {
    const west = rand() < 0.5
    cloud(west ? -80 + rand() * 40 : 22 + rand() * 45, 26 + rand() * 16, -70 + rand() * 100, 2.2 + rand() * 2.2)
  }
  ckit.build(clouds, { get: () => cloudMat })
  group.add(clouds)
  // the bank over Palembang only rolls in for the dive, so it never hides
  // South Sumatra lighting up
  const dive = new THREE.Group()
  for (let i = 0; i < 10; i++) cloud(-10 + rand() * 20, 6 + rand() * 7, -6 + rand() * 14, 1.6 + rand() * 1.4)
  ckit.build(dive, { get: () => cloudMat })
  dive.visible = false
  group.add(dive)

  kit.build(group, mats, { receive: false })

  // South Sumatra: a glowing fill and a gold outline that draws itself
  const fillMat = new THREE.MeshBasicMaterial({ color: '#ffd27a', transparent: true, opacity: 0, depthWrite: false })
  const fill = new THREE.Mesh(new THREE.ShapeGeometry(shapeOf(SUMSEL)).rotateX(-Math.PI / 2), fillMat)
  fill.position.y = LAND_H + 0.04
  group.add(fill)
  const lineMat = new THREE.MeshBasicMaterial({ color: '#ffd27a', transparent: true, opacity: 0 })
  const lineGeo = ribbon(SUMSEL.map(project), 0.6, true)
  const line = new THREE.Mesh(lineGeo, lineMat)
  line.position.y = LAND_H + 0.07
  group.add(line)
  const lineVerts = lineGeo.attributes.position.count

  // Palembang pin: a gold drop over a pulsing ring
  const pinMat = new THREE.MeshStandardMaterial({ color: '#ffcf6a', emissive: '#ffb84a', emissiveIntensity: 0.8, flatShading: true, metalness: 0.4, roughness: 0.4 })
  const pin = new THREE.Group()
  const drop = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.6, 8).rotateX(Math.PI), pinMat)
  drop.position.y = 2.4
  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.6, 1), pinMat)
  head.position.y = 3.3
  const ringMat = new THREE.MeshBasicMaterial({ color: '#ffd27a', transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false })
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.7, 0.95, 32).rotateX(-Math.PI / 2), ringMat)
  ring.position.y = LAND_H + 0.1
  pin.add(drop, head, ring)
  group.add(pin)

  const palembang = new THREE.Vector3(0, LAND_H + 3.3, 0)

  return {
    group,
    palembang,
    /** glow: 0–1 how lit South Sumatra is; pinK: 0–1 the pin's presence. */
    update(dt, time, glow, pinK, reduce, diveK = 0) {
      dive.visible = diveK > 0
      dive.position.y = (1 - diveK) * -12
      fillMat.opacity = glow * 0.42
      lineMat.opacity = Math.min(1, glow * 1.6)
      const tris = Math.floor((lineVerts / 3) * Math.min(1, glow * 1.25))
      lineGeo.setDrawRange(0, tris * 3)
      pin.visible = pinK > 0.01
      pin.scale.setScalar(Math.max(0.01, pinK))
      if (!reduce) {
        drop.position.y = 2.4 + Math.sin(time * 2.2) * 0.25
        head.position.y = drop.position.y + 0.9
        const k = (time * 0.8) % 1
        ring.scale.setScalar(1 + k * 2.4)
        ringMat.opacity = (1 - k) * 0.85 * pinK
        clouds.position.x = Math.sin(time * 0.05) * 3
      }
    },
    dispose() {
      group.traverse((o) => {
        if (o.isMesh) o.geometry.dispose()
      })
      cloudMat.dispose()
      fillMat.dispose()
      lineMat.dispose()
      pinMat.dispose()
      ringMat.dispose()
    },
  }
}
