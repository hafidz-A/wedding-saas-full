/* ============================================================
   musi/engine/fireworks.js — the finale over Palembang.

   One pooled particle system (THREE.Points, additive glow): rockets climb
   with a spark trail, then burst as a peony, a willow, a ring or a heart, in
   gold, maroon and white (plus the palette's gold). A second Points object
   draws the same particles mirrored in the river, faint — the reflection.

   prefers-reduced-motion: freeze() leaves a few bursts hanging still in the
   sky instead of an animated show.
   ============================================================ */
import * as THREE from 'three'

const VERT = /* glsl */ `
attribute vec3 color;
attribute vec2 look; // x: alpha, y: size (world units)
uniform float uScale;
uniform float uFlip;
uniform float uWaterY;
varying vec3 vColor;
varying float vAlpha;
void main() {
  vec3 p = position;
  if (uFlip > 0.5) p.y = uWaterY - (p.y - uWaterY);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = max(1.0, look.y * uScale / max(1.0, -mv.z));
  vColor = color;
  vAlpha = look.x;
}`

const FRAG = /* glsl */ `
uniform float uOpacity;
varying vec3 vColor;
varying float vAlpha;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  if (d > 0.5) discard;
  float core = smoothstep(0.5, 0.0, d);
  float a = vAlpha * core * core * uOpacity;
  gl_FragColor = vec4(vColor * (0.6 + core), a);
}`

const PATTERNS = ['peony', 'willow', 'ring', 'heart', 'peony', 'ring']

export function createFireworks(quality, waterY) {
  const N = quality === 'high' ? 4200 : quality === 'medium' ? 2600 : 1300
  const pos = new Float32Array(N * 3)
  const col = new Float32Array(N * 3)
  const look = new Float32Array(N * 2)
  const vel = new Float32Array(N * 3)
  const life = new Float32Array(N)
  const maxLife = new Float32Array(N)
  const drag = new Float32Array(N)
  const grav = new Float32Array(N)
  const kind = new Uint8Array(N) // 0 dead, 1 spark, 2 rocket
  const size0 = new Float32Array(N)
  const burst = [] // pending bursts carried by rockets: index → spec
  for (let i = 0; i < N; i++) pos[i * 3 + 1] = -9999

  const geo = new THREE.BufferGeometry()
  const aPos = new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage)
  const aCol = new THREE.BufferAttribute(col, 3).setUsage(THREE.DynamicDrawUsage)
  const aLook = new THREE.BufferAttribute(look, 2).setUsage(THREE.DynamicDrawUsage)
  geo.setAttribute('position', aPos)
  geo.setAttribute('color', aCol)
  geo.setAttribute('look', aLook)
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5)

  const uniforms = { uScale: { value: 600 }, uFlip: { value: 0 }, uWaterY: { value: waterY }, uOpacity: { value: 1 } }
  const mk = (flip, opacity) =>
    new THREE.ShaderMaterial({
      uniforms: { ...THREE.UniformsUtils.clone(uniforms), uFlip: { value: flip }, uOpacity: { value: opacity } },
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    })
  const mat = mk(0, 1)
  const mirrorMat = mk(1, 0.28)
  const points = new THREE.Points(geo, mat)
  const mirror = new THREE.Points(geo, mirrorMat)
  points.frustumCulled = mirror.frustumCulled = false
  points.renderOrder = mirror.renderOrder = 5
  const group = new THREE.Group()
  group.add(points, mirror)

  let head = 0
  const colors = [new THREE.Color('#ffd27a'), new THREE.Color('#d8323a'), new THREE.Color('#fff4e0'), new THREE.Color('#d6a43a')]
  const tmpC = new THREE.Color()

  function spawn(x, y, z, vx, vy, vz, c, L, d, g, s, k) {
    const i = head
    head = (head + 1) % N
    pos[i * 3] = x
    pos[i * 3 + 1] = y
    pos[i * 3 + 2] = z
    vel[i * 3] = vx
    vel[i * 3 + 1] = vy
    vel[i * 3 + 2] = vz
    col[i * 3] = c.r
    col[i * 3 + 1] = c.g
    col[i * 3 + 2] = c.b
    life[i] = maxLife[i] = L
    drag[i] = d
    grav[i] = g
    size0[i] = s
    kind[i] = k
    look[i * 2] = 1
    look[i * 2 + 1] = s
    burst[i] = null
    return i
  }

  const right = new THREE.Vector3(1, 0, 0)
  const up = new THREE.Vector3(0, 1, 0)

  function explode(x, y, z, spec) {
    const { pattern, c1, c2 } = spec
    const big = spec.scale || 1
    if (pattern === 'heart') {
      const n = 120
      for (let i = 0; i < n; i++) {
        const t = (i / n) * Math.PI * 2
        const hx = 16 * Math.sin(t) ** 3
        const hy = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)
        const k = 1.8 * big
        const vx = (right.x * hx + up.x * hy) * k
        const vy = (right.y * hx + up.y * hy) * k
        const vz = (right.z * hx + up.z * hy) * k
        spawn(x, y, z, vx, vy, vz, i % 3 ? c1 : c2, 2.0 + Math.random() * 0.4, 1.6, 3, 3.2 * big, 1)
      }
      return
    }
    const n = pattern === 'ring' ? 90 : pattern === 'willow' ? 130 : 150
    // a random plane for rings, tilted toward the viewer
    const a = Math.random() * Math.PI
    for (let i = 0; i < n; i++) {
      let dx
      let dy
      let dz
      if (pattern === 'ring') {
        const t = (i / n) * Math.PI * 2
        dx = Math.cos(t) * Math.cos(a)
        dy = Math.sin(t)
        dz = Math.cos(t) * Math.sin(a)
      } else {
        const u = Math.random() * 2 - 1
        const t = Math.random() * Math.PI * 2
        const r = Math.sqrt(1 - u * u)
        dx = r * Math.cos(t)
        dy = u
        dz = r * Math.sin(t)
      }
      const willow = pattern === 'willow'
      const sp = (willow ? 19 : pattern === 'ring' ? 34 : 30 + Math.random() * 6) * big
      spawn(
        x, y, z, dx * sp, dy * sp, dz * sp,
        willow ? c1 : i % 4 === 0 ? c2 : c1,
        willow ? 3.2 + Math.random() * 0.6 : 1.7 + Math.random() * 0.5,
        willow ? 0.9 : 1.7,
        willow ? 2.6 : 6,
        (willow ? 2.6 : 3.1) * big,
        1,
      )
    }
  }

  let frozen = false

  return {
    group,
    /** Launch a rocket from (x, ground, z) bursting at height y. */
    launch({ x, y, z, pattern, scale = 1 }) {
      if (frozen) return
      const p = pattern || PATTERNS[Math.floor(Math.random() * PATTERNS.length)]
      const c1 = colors[Math.floor(Math.random() * colors.length)]
      let c2 = colors[Math.floor(Math.random() * colors.length)]
      if (c2 === c1) c2 = colors[(colors.indexOf(c1) + 1) % colors.length]
      const rise = 1.1 + Math.random() * 0.3
      const i = spawn(x, 2, z, 0, (y - 2) / rise, 0, colors[0], rise, 0, 0, 1.4, 2)
      burst[i] = { pattern: p, c1, c2, scale }
    },
    setPalette(gold) {
      colors[3].set(gold)
    },
    setView(camera, heightPx) {
      const s = heightPx / (2 * Math.tan((camera.fov * Math.PI) / 360))
      mat.uniforms.uScale.value = s
      mirrorMat.uniforms.uScale.value = s
      right.setFromMatrixColumn(camera.matrixWorld, 0)
      up.setFromMatrixColumn(camera.matrixWorld, 1)
    },
    update(dt) {
      if (frozen || dt <= 0) return
      const step = Math.min(dt, 0.05)
      for (let i = 0; i < N; i++) {
        if (!kind[i]) continue
        life[i] -= step
        if (life[i] <= 0) {
          if (kind[i] === 2 && burst[i]) explode(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2], burst[i])
          kind[i] = 0
          look[i * 2] = 0
          pos[i * 3 + 1] = -9999
          burst[i] = null
          continue
        }
        const f = Math.exp(-drag[i] * step)
        vel[i * 3] *= f
        vel[i * 3 + 1] = vel[i * 3 + 1] * f - grav[i] * step
        vel[i * 3 + 2] *= f
        pos[i * 3] += vel[i * 3] * step
        pos[i * 3 + 1] += vel[i * 3 + 1] * step
        pos[i * 3 + 2] += vel[i * 3 + 2] * step
        const k = life[i] / maxLife[i]
        if (kind[i] === 2) {
          // the rocket leaves a short spark trail
          if (Math.random() < 0.7) {
            tmpC.setRGB(1, 0.75, 0.4)
            spawn(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2], (Math.random() - 0.5) * 2, -2, (Math.random() - 0.5) * 2, tmpC, 0.45, 2, 4, 0.9, 1)
          }
          look[i * 2] = 1
        } else {
          const flicker = k < 0.35 ? 0.55 + Math.random() * 0.45 : 1
          look[i * 2] = Math.pow(k, 0.7) * flicker
          look[i * 2 + 1] = size0[i] * (0.6 + 0.4 * k)
        }
      }
      aPos.needsUpdate = aCol.needsUpdate = aLook.needsUpdate = true
    },
    /** Reduced motion: a few bursts, frozen mid-bloom. */
    freeze(spots) {
      for (const s of spots) explode(s.x, s.y, s.z, { pattern: s.pattern, c1: colors[0], c2: colors[1], scale: s.scale || 1 })
      for (let k = 0; k < 14; k++) this.update(0.05)
      frozen = true
      aPos.needsUpdate = aCol.needsUpdate = aLook.needsUpdate = true
    },
    unfreeze() {
      frozen = false
    },
    clear() {
      for (let i = 0; i < N; i++) {
        kind[i] = 0
        look[i * 2] = 0
        pos[i * 3 + 1] = -9999
      }
      aPos.needsUpdate = aLook.needsUpdate = true
    },
    dispose() {
      geo.dispose()
      mat.dispose()
      mirrorMat.dispose()
    },
  }
}
