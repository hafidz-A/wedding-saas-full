/* ============================================================
   musi/config/timeline.js — where every beat sits on the journey.

   Act 1 (cover → gallery) is written against a NOMINAL timeline T ∈ [0, 1]:

     0.00–0.03  opening   the Rumah Limas courtyard, names on screen
     0.03–0.11  the house — the guest walks in, room by room (HOUSE_TOUR):
                garang (up the right-hand stair) → lawang kipas (the front
                wall folds up) → kekijing (the stepped floors) → gegajah (the
                main hall; a glance into the pangkeng and down to the dapur)
                → the pelaminan, where a flash of light lifts the camera
     0.11–0.20  quote     flash → high over Sumatra, South Sumatra lights up,
                          the camera dives through the clouds to Palembang
     0.20–1.00  river     the boat ride down the Musi, one landmark per section

   Each journey section owns one segment. A section the couple switches off is
   not removed (the camera would jump), it is squeezed to a short stretch of
   scroll, so the ride stays continuous. Scroll progress p ∈ [0, 1] maps to T
   through those (re)weighted segments.

   Act 2 (RSVP, wishes, gift) and the finale (closing + fireworks) scroll
   normally after the track; the engine reads their own progress.

   Plain data + pure functions: unit-tested, no DOM.
   ============================================================ */

/** Journey segments in ride order. `type` is the section that owns it. */
// `scroll` stretches a segment's share of the scroll without moving its beats:
// the house is short on T but long to scroll, so it reads as a place to explore
export const SEGMENTS = [
  { key: 'opening', type: null, from: 0, to: 0.03, scroll: 1.2 },
  { key: 'garang', type: null, from: 0.03, to: 0.045, scroll: 2.4 },
  { key: 'lawangKipas', type: null, from: 0.045, to: 0.056, scroll: 2.2 },
  { key: 'kekijing', type: null, from: 0.056, to: 0.072, scroll: 2.6 },
  { key: 'gegajah', type: null, from: 0.072, to: 0.098, scroll: 4.4 },
  { key: 'pelaminan', type: null, from: 0.098, to: 0.11, scroll: 1.6 },
  // the map flight keeps most of its length even without the quote: it is the
  // bridge between the house and the river and must stay watchable
  { key: 'quote', type: 'musiQuote', from: 0.11, to: 0.2, keep: 0.6 },
  { key: 'couple', type: 'musiCouple', from: 0.2, to: 0.38 },
  { key: 'story', type: 'musiStory', from: 0.38, to: 0.56 },
  { key: 'saveDate', type: 'musiSaveDate', from: 0.56, to: 0.65 },
  { key: 'events', type: 'musiEvents', from: 0.65, to: 0.78 },
  { key: 'gallery', type: 'musiGallery', from: 0.78, to: 1 },
]

/** How much scroll a switched-off segment keeps, relative to its full length. */
const SKIPPED_WEIGHT = 0.2
/** Scroll length of the full journey with every section on, in viewport heights. */
const FULL_TRACK_VH = 1500

/** Text windows on T: [fade in from, fully in, fade out from, gone]. */
export const BEATS = {
  opening: [-1, 0, 0.02, 0.028],
  quote: [0.142, 0.152, 0.178, 0.187],
  groom: [0.272, 0.284, 0.31, 0.32],
  bride: [0.325, 0.337, 0.367, 0.378],
  saveDate: [0.602, 0.612, 0.637, 0.647],
  events: [0.705, 0.716, 0.765, 0.777],
  gallery: [0.858, 0.87, 0.982, 0.998],
}

/**
 * The house tour: one small card per room, in the order the camera meets
 * them (copy in config/limasTour.js). Same [in, full, out, gone] windows.
 */
export const HOUSE_TOUR = {
  garang: [0.0335, 0.0365, 0.042, 0.0445],
  lawangKipas: [0.0465, 0.049, 0.0535, 0.0556],
  kekijing: [0.0575, 0.0605, 0.069, 0.0715],
  gegajah: [0.0735, 0.0755, 0.0795, 0.0815],
  pangkeng: [0.0825, 0.0845, 0.0875, 0.0893],
  dapur: [0.0903, 0.0921, 0.0952, 0.0968],
  pelaminan: [0.0978, 0.0992, 0.1016, 0.1032],
}

/** Story moments share one window of the story segment. */
const STORY_WINDOW = [0.448, 0.556]
export const MAX_STORY_MOMENTS = 5

/** Beat windows for `count` story moments, evenly spread over the story window. */
export function storyBeats(count) {
  const n = Math.max(1, Math.min(MAX_STORY_MOMENTS, count))
  const [a, b] = STORY_WINDOW
  const span = (b - a) / n
  const fade = Math.min(0.01, span * 0.18)
  return Array.from({ length: n }, (_, i) => {
    const s = a + span * i
    return [s, s + fade, s + span - fade * 1.6, s + span - fade * 0.4].map((v) => Math.round(v * 10000) / 10000)
  })
}

/** Photos the gallery card shows (more would make the carousel a chore). */
export const MAX_GALLERY_PHOTOS = 12

/*
 * Every river segment plays the same three beats, in this order:
 *
 *   1. the boat rides in until the segment's landmark is framed (the first
 *      ~30% of the segment covers ~75% of its distance, see rideShare),
 *   2. the landmark pops up out of the ground (APPEAR) — a short jelly bounce;
 *      Jembatan Ampera instead builds itself: towers rise, then the deck grows
 *      out from both banks until the two halves meet in the middle,
 *   3. the section's glass card shows (BEATS) while the boat drifts slowly,
 *
 * then the boat rides on to the next landmark. The finale lifts the camera
 * over the whole city for the fireworks.
 */

/**
 * River stations: where the boat is (0 = start of the river, 1 = its end) when
 * each river segment ends. Inside a segment the boat travels quickly first and
 * then drifts slowly while that segment's card is up (engine/scene.js). Each
 * stop is placed so the fast part ends with the landmark in frame.
 */
export const RIVER_STOPS = {
  start: 0.02,
  couple: 0.054,
  story: 0.35,
  saveDate: 0.445,
  events: 0.662,
  gallery: 0.83,
}

/** Where landmarks stand along the river (same 0–1 scale as RIVER_STOPS). */
export const LANDMARKS = {
  ampera: 0.1,
  kutoBesak: 0.29,
  masjidAgung: 0.45,
  limasRow: 0.62,
  rafts: 0.66,
  pempek: 0.775,
  lrt: 0.8,
  kampung: 0.845,
}

/**
 * When (on T) each landmark appears: right after the boat has framed it and
 * just before that segment's card. Scrolling back past it sinks it again.
 * A segment with several landmarks pops them one after another.
 */
export const APPEAR = {
  ampera: 0.248,
  kutoBesak: 0.428,
  masjidAgung: 0.585,
  limasRow: 0.686,
  rafts: 0.693,
  lrt: 0.842,
  pempek: 0.848,
  kampung: 0.854,
}

/** Chapter labels for the progress rail, keyed by where they start on T. */
export const CHAPTERS = [
  { from: 0, label: 'Rumah Limas' },
  { from: 0.03, label: 'Garang' },
  { from: 0.045, label: 'Lawang Kipas' },
  { from: 0.056, label: 'Kekijing' },
  { from: 0.072, label: 'Gegajah' },
  { from: 0.105, label: 'Bumi Sriwijaya' },
  { from: 0.2, label: 'Sungai Musi' },
]
export const FINALE_CHAPTER = 'Langit Palembang'

const clamp = (v, a, b) => Math.min(b, Math.max(a, v))

/**
 * Build the scroll mapping for a set of enabled section types. `storyCount`
 * and `photoCount` let those two segments follow their content. Returns the
 * track length (vh) and a p → T mapper.
 */
export function buildTimeline(enabledTypes, { storyCount = 3, photoCount = 6 } = {}) {
  const weights = SEGMENTS.map((s) => {
    const len = s.to - s.from
    const on = !s.type || enabledTypes.has(s.type)
    if (!on) return len * (s.keep ?? SKIPPED_WEIGHT)
    if (s.scroll) return len * s.scroll
    if (s.type === 'musiStory') return len * clamp(0.55 + storyCount * 0.15, 0.7, 1.3)
    if (s.type === 'musiGallery') return len * clamp(0.6 + photoCount * 0.06, 0.7, 1.3)
    return len
  })
  const total = weights.reduce((a, b) => a + b, 0)
  // knots: cumulative p at each segment boundary
  const P = [0]
  for (const w of weights) P.push(P[P.length - 1] + w / total)
  const T = [SEGMENTS[0].from, ...SEGMENTS.map((s) => s.to)]
  return {
    trackVh: Math.round(FULL_TRACK_VH * total),
    toNominal(p) {
      if (p <= 0) return 0
      if (p >= 1) return 1
      for (let i = 1; i < P.length; i++) {
        if (p <= P[i]) {
          const k = (p - P[i - 1]) / (P[i] - P[i - 1] || 1)
          return T[i - 1] + (T[i] - T[i - 1]) * k
        }
      }
      return 1
    },
    toProgress(t) {
      if (t <= 0) return 0
      if (t >= 1) return 1
      for (let i = 1; i < T.length; i++) {
        if (t <= T[i]) {
          const k = (t - T[i - 1]) / (T[i] - T[i - 1] || 1)
          return P[i - 1] + (P[i] - P[i - 1]) * k
        }
      }
      return 1
    },
  }
}

/** Speed profile inside one river segment: a quick run, then a slow drift. */
const speed = (k) => 0.22 + 2.4 * Math.exp(-(((k - 0.17) / 0.12) ** 2))
const PROFILE = (() => {
  const n = 96
  const acc = [0]
  for (let i = 1; i <= n; i++) acc.push(acc[i - 1] + speed((i - 0.5) / n))
  return acc.map((v) => v / acc[n])
})()

/** Share of a segment's distance covered at local time k ∈ [0, 1]. */
export function rideShare(k) {
  const x = clamp(k, 0, 1) * (PROFILE.length - 1)
  const i = Math.floor(x)
  if (i >= PROFILE.length - 1) return 1
  return PROFILE[i] + (PROFILE[i + 1] - PROFILE[i]) * (x - i)
}

const RIVER_KEYS = ['couple', 'story', 'saveDate', 'events', 'gallery']

/** Where the boat is on the river (0–1) at nominal time T. */
export function riverAt(T) {
  if (T <= 0.2) return RIVER_STOPS.start
  let prev = RIVER_STOPS.start
  for (const key of RIVER_KEYS) {
    const s = SEGMENTS.find((x) => x.key === key)
    const stop = RIVER_STOPS[key]
    if (T <= s.to) return prev + (stop - prev) * rideShare((T - s.from) / (s.to - s.from))
    prev = stop
  }
  return RIVER_STOPS.gallery
}
