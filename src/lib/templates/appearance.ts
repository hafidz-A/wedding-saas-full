/** One registry answering "what appearance options does template X have" —
 *  ornament motifs (per-template, Indonesian UI labels) + a re-export of the
 *  palette allowlist. Consumers (owner theme route, dashboard EditorWorkspace,
 *  admin appearance dialog + create form) all read this instead of hardcoding
 *  their own copy, so adding a template is one edit here.
 *
 *  Leniency mirrors `isPaletteAllowedForTemplate` exactly: an unknown/legacy
 *  `template_id` accepts any ornament key known to ANY template. A KNOWN
 *  template with an empty list (Solary — the three.js backdrop draws its own
 *  scene, no ornament layer) is denied — that is the point of the registry. */
import { TEMPLATE_PALETTES, isPaletteAllowedForTemplate } from '@/lib/config/palette-allowlist'

export interface OrnamentOption {
  key: string
  /** Indonesian UI label (operator- and couple-facing controls are ID). */
  label: string
}

export const TEMPLATE_ORNAMENTS: Record<string, readonly OrnamentOption[]> = {
  lovebirds: [
    { key: 'birds', label: 'Burung terbang' },
    { key: 'butterflies', label: 'Kupu-kupu' },
    { key: 'perched', label: 'Burung bertengger' },
  ],
  // three.js backdrop draws its own scene — no ornament layer to swap.
  solary: [],
}

const ALL_ORNAMENTS: readonly OrnamentOption[] = Object.values(TEMPLATE_ORNAMENTS).flat()
const ORNAMENT_UNION = new Set(ALL_ORNAMENTS.map((o) => o.key))

/** Ornament options for `template`. Unknown/legacy template ⇒ lenient union
 *  of every known ornament (so an old/legacy row's editor still offers a
 *  picker); a known template with `[]` (Solary) stays empty. */
export function templateOrnaments(template: string | null | undefined): readonly OrnamentOption[] {
  if (template && template in TEMPLATE_ORNAMENTS) return TEMPLATE_ORNAMENTS[template]
  return ALL_ORNAMENTS
}

/** True if `key` is a valid ornament for `template`. Same lenient-unknown /
 *  strict-known-empty semantics as `isPaletteAllowedForTemplate`. */
export function isOrnamentAllowedForTemplate(template: string | null | undefined, key: string): boolean {
  if (template && template in TEMPLATE_ORNAMENTS) {
    return TEMPLATE_ORNAMENTS[template].some((o) => o.key === key)
  }
  return ORNAMENT_UNION.has(key)
}

/** Palette keys for `template` — re-exports the palette allowlist (single
 *  source of truth) rather than duplicating it. Unknown template ⇒ empty
 *  (callers that need lenient validation use `isPaletteAllowedForTemplate`
 *  directly; this is for building a picker's option list). */
export function templatePalettes(template: string | null | undefined): readonly string[] {
  if (template && TEMPLATE_PALETTES[template]) return TEMPLATE_PALETTES[template]
  return []
}

export { isPaletteAllowedForTemplate }
