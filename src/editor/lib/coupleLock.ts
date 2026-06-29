/**
 * Pure decision logic for the editor's couple-name lock mechanic.
 *
 * Couple-linked section fields (schema `linkedGroup: 'couple'`) are managed
 * centrally via `config.couple`. In the section editor they render LOCKED until
 * the owner deliberately overrides them (`props.coupleOverride`). These pure
 * predicates encode the gate so it can be unit-tested without rendering React;
 * `FieldEditor` consumes them.
 */
import { hasCouple, injectCoupleProps, type CoupleData } from '@/lib/meta/couple'

type LinkedField = { key: string; linkedGroup?: string }
type SectionLike = { type: string; props?: Record<string, unknown> | null }

/** True for a field bound to the central couple group. */
export function isCoupleField(field: { linkedGroup?: string }): boolean {
  return field.linkedGroup === 'couple'
}

/**
 * A couple-linked field renders LOCKED when a couple exists centrally and this
 * section hasn't opted out. Legacy sections (no couple set) and overridden
 * sections render the field as a normal editable input.
 */
export function isCoupleFieldLocked(
  field: { linkedGroup?: string },
  props: Record<string, unknown> | null | undefined,
  couple: CoupleData | null | undefined,
): boolean {
  return isCoupleField(field) && hasCouple(couple) && !(props && props.coupleOverride)
}

/**
 * The single Relink control shows once when the section has couple fields, a
 * couple exists centrally, and the section is currently overriding it.
 */
export function shouldShowRelink(
  fields: ReadonlyArray<{ linkedGroup?: string }>,
  props: Record<string, unknown> | null | undefined,
  couple: CoupleData | null | undefined,
): boolean {
  return fields.some(isCoupleField) && hasCouple(couple) && !!(props && props.coupleOverride)
}

/**
 * Values to seed into a section's props when unlocking, so editing starts from
 * the inherited (currently-rendered) value rather than a stale stored copy.
 * Only couple fields are returned.
 */
export function coupleSeedValues(
  section: SectionLike,
  fields: ReadonlyArray<LinkedField>,
  couple: CoupleData | null | undefined,
): Record<string, unknown> {
  const inherited = injectCoupleProps(section, couple)
  const out: Record<string, unknown> = {}
  for (const f of fields) {
    if (isCoupleField(f)) out[f.key] = inherited[f.key] ?? ''
  }
  return out
}
