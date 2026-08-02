/**
 * Width bounds + persistence helpers for the editor's resizable section-list
 * panel. Pure/no React so it can be unit-tested directly and shared between
 * the drag handler, the keyboard handler, and the mount-time localStorage read.
 */

export const SECTION_LIST_WIDTH_DEFAULT = 300
export const SECTION_LIST_WIDTH_MIN = 240
export const SECTION_LIST_WIDTH_MAX = 520
export const SECTION_LIST_WIDTH_KEY = 'fincards.editor.sectionListWidth'

/** Clamp into [MIN, MAX] and round to an integer pixel value. Non-finite
 *  input (NaN, ±Infinity) falls back to the default rather than propagating. */
export function clampSectionListWidth(n: number): number {
  if (!Number.isFinite(n)) return SECTION_LIST_WIDTH_DEFAULT
  return Math.round(Math.min(SECTION_LIST_WIDTH_MAX, Math.max(SECTION_LIST_WIDTH_MIN, n)))
}

/**
 * Parse a raw localStorage value into a clamped width, or `null` if it
 * can't be trusted (missing, empty, non-numeric, non-finite). Never throws —
 * a corrupted stored value must degrade to "use the default", not break the
 * editor on mount.
 */
export function parseStoredWidth(raw: string | null): number | null {
  if (raw === null || raw === '') return null
  const n = Number(raw)
  if (!Number.isFinite(n)) return null
  return clampSectionListWidth(n)
}

/** The panel may never take more than this share of the viewport. */
const MAX_VIEWPORT_SHARE = 0.45

/**
 * Cap a width against the CURRENT viewport. A width chosen on a wide monitor is
 * persisted and would otherwise be restored verbatim on a small laptop, where
 * 520px of panel leaves the field editor barely ~190px to work in. MIN always
 * wins over the share, so a very narrow viewport shrinks the panel to MIN
 * rather than to something unusably thin.
 */
export function fitSectionListWidth(width: number, viewportWidth: number): number {
  const base = clampSectionListWidth(width)
  if (!Number.isFinite(viewportWidth) || viewportWidth <= 0) return base
  const share = Math.floor(viewportWidth * MAX_VIEWPORT_SHARE)
  return Math.max(SECTION_LIST_WIDTH_MIN, Math.min(base, share))
}
