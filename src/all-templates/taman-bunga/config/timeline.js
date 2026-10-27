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
  { key: 'saveDate', type: 'tbSaveDate', from: 0.65, to: 0.712 },
  { key: 'events', type: 'tbEvents', from: 0.712, to: 0.84 },
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
  // the date and events finish by 0.79, so the parchment they are written on
  // has time to roll up before the gallery (parchmentWindow)
  saveDate: [0.655, 0.67, 0.695, 0.71],
  events: [0.715, 0.73, 0.775, 0.79],
  gallery: [0.84, 0.87, 0.975, 1],
}

/** The love-story moments share the story segment evenly. */
// (starts after the parchment has unrolled: parchmentWindow)
const STORY_WINDOW = [0.435, 0.645]
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
 * When the parchment is out: it unrolls just before the first of the story,
 * the date and the events (whichever are on) and rolls back up as the last
 * one fades. [rods appear, fully open, start rolling up, gone] on T, or null.
 */
export function parchmentWindow(storyCount, enabledTypes) {
  const parts = []
  if (enabledTypes.has('tbStory') && storyCount > 0) {
    const b = storyBeats(storyCount)
    parts.push([b[0][0], b[b.length - 1][3]])
  }
  if (enabledTypes.has('tbSaveDate')) parts.push([BEATS.saveDate[0], BEATS.saveDate[3]])
  if (enabledTypes.has('tbEvents')) parts.push([BEATS.events[0], BEATS.events[3]])
  if (!parts.length) return null
  const a = parts[0][0]
  const d = parts[parts.length - 1][1]
  // ~1.2 screens of scroll to unroll, ~0.85 to roll back up
  return [a - 0.075, a - 0.005, d, d + 0.05]
}

/** Prints per gallery easel; the gallery stands as many easels as it needs. */
export const PER_EASEL = 5
/** How many prints each easel holds, for n photos. */
export function easelSizes(n) {
  const out = []
  for (let i = 0; i < n; i += PER_EASEL) out.push(Math.min(PER_EASEL, n - i))
  return out
}
/**
 * How much scroll an easel's visit takes, in steps: turning toward it and
 * back costs a fixed amount, each print turned one more. So an easel with
 * two photos is a short stop and one with five a long one. The timeline
 * (gallery length) and the engine (each easel's share of it) both read this.
 */
export const EASEL_TURN_STEPS = 1.6
export const easelSteps = (prints) => EASEL_TURN_STEPS + Math.max(0, prints - 1)

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
 * Build the scroll mapping for a set of enabled section types (and how many
 * scroll steps the gallery's easels take). Returns the track length and a
 * p → T mapper.
 */
export function buildTimeline(enabledTypes, { gallerySteps = 0 } = {}) {
  const weights = SEGMENTS.map((s) => {
    const len = s.to - s.from
    const on = !s.type || enabledTypes.has(s.type)
    if (!on) return len * SKIPPED_WEIGHT
    // the gallery's scroll follows its content (easels × their prints, see
    // easelSteps above): ~0.75 of its nominal length per
    // step, so a few photos make a short stop and many a long one
    return s.type === 'tbGallery' ? len * clamp(gallerySteps * 0.75, 1, 24) : len
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
