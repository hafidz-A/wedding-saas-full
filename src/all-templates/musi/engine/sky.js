/* ============================================================
   musi/engine/sky.js — the sky dome, sun glow, moon and stars.

   One gradient dome follows the camera (no parallax, never clipped), coloured
   by the time of day the engine passes in (setTime). Stars and the moon fade
   in with the night. Fog is off for all of it; the scene fog takes the
   horizon colour so land melts into the sky.
   ============================================================ */
import * as THREE from 'three'
import { rng } from './kit.js'

const C = (hex) => new THREE.Color(hex)

/** Key moments of the day: sky top / middle / horizon, sun colour + strength. */
export const DAY_KEYS = {
  day: { top: C('#4f8fd0'), mid: C('#8fc0e6'), horizon: C('#e4eef0'), sun: C('#fff0d4'), glow: 0.5 },
  golden: { top: C('#5c78bc'), mid: C('#c7a6b8'), horizon: C('#ffc884'), sun: C('#ffb468'), glow: 1.0 },
  dusk: { top: C('#1e2350'), mid: C('#5a3a6a'), horizon: C('#f0885a'), sun: C('#ff7444'), glow: 0.9 },
  night: { top: C('#070b1e'), mid: C('#0e1630'), horizon: C('#26305a'), sun: C('#9fb4ff'), glow: 0.0 },
}

const VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  vec4 p = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * p;
  gl_Position.z = gl_Position.w; // always at the far plane
}`

const FRAG = /* glsl */ `
uniform vec3 uTop;
uniform vec3 uMid;
uniform vec3 uHorizon;
uniform vec3 uSunDir;
uniform vec3 uSun;
uniform float uGlow;
varying vec3 vDir;
void main() {
  vec3 d = normalize(vDir);
  float h = d.y;
  vec3 c = mix(uHorizon, uMid, smoothstep(-0.02, 0.22, h));
  c = mix(c, uTop, smoothstep(0.18, 0.75, h));
  c = mix(c, uHorizon * 0.55, smoothstep(0.0, -0.25, h));
  float s = max(dot(d, normalize(uSunDir)), 0.0);
  c += uSun * (pow(s, 900.0) * 3.0 + pow(s, 24.0) * 0.35 + pow(s, 4.0) * 0.12) * uGlow;
  gl_FragColor = vec4(c, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`

export function createSky(quality) {
  const group = new THREE.Group()
  group.name = 'sky'

  const uniforms = {
    uTop: { value: DAY_KEYS.day.top.clone() },
    uMid: { value: DAY_KEYS.day.mid.clone() },
    uHorizon: { value: DAY_KEYS.day.horizon.clone() },
    uSunDir: { value: new THREE.Vector3(0.3, 0.6, -0.7) },
    uSun: { value: DAY_KEYS.day.sun.clone() },
    uGlow: { value: 0.5 },
  }
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(1600, 32, 16),
    new THREE.ShaderMaterial({ uniforms, vertexShader: VERT, fragmentShader: FRAG, side: THREE.BackSide, depthWrite: false, fog: false }),
  )
  dome.renderOrder = -10
  dome.frustumCulled = false
  group.add(dome)

  // stars: upper hemisphere only
  const rand = rng(77)
  const n = quality === 'low' ? 500 : 1100
  const pos = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) {
    const u = rand() * Math.PI * 2
    const y = 0.08 + rand() * 0.92
    const r = Math.sqrt(1 - y * y)
    pos.set([Math.cos(u) * r * 1500, y * 1500, Math.sin(u) * r * 1500], i * 3)
  }
  const starGeo = new THREE.BufferGeometry()
  starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  const starMat = new THREE.PointsMaterial({ color: '#fff8e8', size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false, fog: false })
  const stars = new THREE.Points(starGeo, starMat)
  stars.frustumCulled = false
  group.add(stars)

  // moon + a soft halo
  const moonMat = new THREE.MeshBasicMaterial({ color: '#fff3d2', transparent: true, opacity: 0, fog: false })
  const haloMat = new THREE.MeshBasicMaterial({ color: '#cdd8ff', transparent: true, opacity: 0, fog: false, blending: THREE.AdditiveBlending, depthWrite: false })
  const moon = new THREE.Group()
  moon.add(new THREE.Mesh(new THREE.IcosahedronGeometry(26, 2), moonMat))
  moon.add(new THREE.Mesh(new THREE.SphereGeometry(70, 16, 12), haloMat))
  moon.position.set(-520, 620, -1100)
  group.add(moon)

  const tmp = new THREE.Color()
  const mix3 = (a, b, k, out) => out.copy(a).lerp(b, k)

  return {
    group,
    /** Blend between day keys: `night` 0–1, `golden` 0–1 (on the way). */
    setTime({ golden = 0, dusk = 0, night = 0 }, sunDir) {
      const A = DAY_KEYS
      for (const key of ['top', 'mid', 'horizon', 'sun']) {
        const u = uniforms[key === 'sun' ? 'uSun' : `u${key[0].toUpperCase()}${key.slice(1)}`].value
        mix3(A.day[key], A.golden[key], golden, u)
        u.lerp(A.dusk[key], dusk)
        u.lerp(A.night[key], night)
      }
      let glow = A.day.glow + (A.golden.glow - A.day.glow) * golden
      glow += (A.dusk.glow - glow) * dusk
      glow += (A.night.glow - glow) * night
      uniforms.uGlow.value = glow
      if (sunDir) uniforms.uSunDir.value.copy(sunDir)
      starMat.opacity = Math.max(0, night * 1.1 - 0.1)
      moonMat.opacity = night
      haloMat.opacity = night * 0.12
    },
    horizon(out = tmp) {
      return out.copy(uniforms.uHorizon.value)
    },
    follow(camera) {
      group.position.copy(camera.position)
    },
    dispose() {
      dome.geometry.dispose()
      dome.material.dispose()
      starGeo.dispose()
      starMat.dispose()
      moon.traverse((o) => o.geometry?.dispose())
      moonMat.dispose()
      haloMat.dispose()
    },
  }
}
