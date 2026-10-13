import { splitPoints } from './splitPoints.js'

const blank = (v) => typeof v !== 'string' || v.trim() === ''

/**
 * Fold schedule items into display groups.
 *
 * Couples write a rundown as one item with a time + title ("08.00 · Akad
 * Nikah") followed by items that have ONLY a description — sub-steps of that
 * event. Each item without a time and a title is a continuation: its text
 * becomes more points under the item above it (and takes that item's colour),
 * instead of rendering as a lone, title-less card.
 *
 * Returns [{ key, time, title, icon, accent, points: string[] }].
 */
export function groupSchedule(events) {
  const groups = []
  ;(Array.isArray(events) ? events : []).forEach((ev, i) => {
    if (!ev || typeof ev !== 'object') return
    const points = splitPoints(ev.description)
    const isContinuation = blank(ev.time) && blank(ev.title)
    const prev = groups[groups.length - 1]
    if (isContinuation && prev) {
      prev.points.push(...points)
      return
    }
    if (isContinuation && points.length === 0) return // fully empty item
    groups.push({
      key: ev.id || String(i),
      time: blank(ev.time) ? '' : ev.time.trim(),
      title: blank(ev.title) ? '' : ev.title.trim(),
      icon: ev.icon,
      accent: ev.accent,
      points,
    })
  })
  return groups
}
