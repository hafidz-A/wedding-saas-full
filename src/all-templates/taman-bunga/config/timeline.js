/* ============================================================
   taman-bunga/config/timeline.js — where every beat sits on the walk.

   The camera choreography (gate → rose arch → path → gazebo, dusk → night)
   is written against a NOMINAL timeline T ∈ [0, 1]. Each journey section owns
   one segment of it. When the couple switches a section off in the editor its
   segment is not removed — that would make the camera jump — it is squeezed to
   a short stretch of scroll, so the walk stays continuous and the guest never
   scrolls through a long empty stretch.

   Scroll progress p ∈ [0, 1] maps to T through those (re)weighted segments.
   ============================================================ */

/** Journey segments in walk order. `type` is the section that owns it. */
export const SEGMENTS = [
  { key: 'opening', type: null, from: 0, to: 0.07 },
  { key: 'quote', type: 'tbQuote', from: 0.07, to: 0.175 },
  { key: 'couple', type: 'tbCouple', from: 0.175, to: 0.395 },
  { key: 'story', type: 'tbStory', from: 0.395, to: 0.65 },
  { key: 'saveDate', type: 'tbSaveDate', from: 0.65, to: 0.73 },
  { key: 'events', type: 'tbEvents', from: 0.73, to: 0.84 },
  { key: 'gallery', type: 'tbGallery', from: 0.84, to: 1 },
]

/** How much scroll a switched-off segment keeps, relative to its full length. */
const SKIPPED_WEIGHT = 0.2
/** Scroll length of the full journey with every section on, in viewport heights. */
const FULL_TRACK_VH = 1700

/** Text windows on T: [fade in from, fully in, fade out from, gone]. */
export const BEATS = {
  opening: [-1, 0, 0.035, 0.06],
  quote: [0.075, 0.1, 0.14, 0.165],
  groom: [0.19, 0.23, 0.27, 0.3],
  bride: [0.285, 0.325, 0.365, 0.395],
  saveDate: [0.655, 0.675, 0.705, 0.725],
  events: [0.735, 0.76, 0.82, 0.845],
  gallery: [0.84, 0.87, 0.975, 1],
}

/** The love-story moments share the story segment evenly. */
const STORY_WINDOW = [0.4, 0.645]
export const MAX_STORY_MOMENTS = 5

export function storyBeats(count) {
  const n = Math.max(1, Math.min(MAX_STORY_MOMENTS, count))
  const span = (STORY_WINDOW[1] - STORY_WINDOW[0]) / n
  return Array.from({ length: n }, (_, i) => {
    const s = STORY_WINDOW[0] + i * span
    return [s, s + span * 0.28, s + span * 0.72, s + span]
  })
}

const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
const seg = (p, a, b) => clamp((p - a) / (b - a), 0, 1)

/** Distance walked at nominal time T (plus act-2 progress q). Shared with the engine. */
export function walkDistance(T, q = 0) {
  return 3 * seg(T, 0.36, 0.66) + 2.5 * seg(T, 0.66, 1) + 2.5 * q
}

/**
 * Where the paper lanterns lift off: the walk distance at which the guest
 * reaches each one. One per love-story moment, so a lantern rises while that
 * moment's text is on screen; without a story, three along the path. Kept
 * few on purpose — they are an accent, not a crowd.
 */
export function lanternStops(storyCount, storyOn) {
  if (storyOn && storyCount > 0) return storyBeats(storyCount).map((b) => walkDistance((b[1] + b[2]) / 2))
  return [1, 2.8, 4.6]
}

/**
 * Build the scroll mapping for a set of enabled section types.
 * Returns the track length and a p → T mapper.
 */
export function buildTimeline(enabledTypes) {
  const weights = SEGMENTS.map((s) => {
    const len = s.to - s.from
    const on = !s.type || enabledTypes.has(s.type)
    return on ? len : len * SKIPPED_WEIGHT
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
  }
}
