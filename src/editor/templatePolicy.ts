export interface SlotLock {
  lockType?: boolean
  lockPosition?: boolean
  lockDisable?: boolean
}

export interface TemplatePolicy {
  fixedSections: boolean
  locks: Record<string, SlotLock>
  swappablePool: string[]
  pinnedFirstId?: string
  pinnedLastId?: string
  maxSections?: number          // cap on section count (lovebirds: 10)
  anchorFirstType?: string      // section TYPE pinned to index 0 (lovebirds: 'hero')
  anchorLastType?: string       // section TYPE pinned to the last index (lovebirds: 'footer')
  lockedTypes?: string[]        // types that can't be removed or type-changed
  mandatoryTypes?: string[]     // types that must always exist: no remove/disable/type-change, position-locked
  swapGroups?: Record<string, string[]> // type -> the only types it may swap with (incl. itself)
  lockSectionCount?: boolean    // fixed section count: no add + no remove (lovebirds). drag/edit/swap still allowed
}

const SOLARY_SWAPPABLE_POOL = [
  'welcomePlanet',
  'storyPlanet',
  'countdownPlanet',
  'detailsPlanet',
  'rsvpPlanet',
  'teamPlanet',
  'giftPlanet',
  'quotePlanet',
  'schedulePlanet',
  'liveStreamPlanet',
  'faqPlanet',
]

const solaryPolicy: TemplatePolicy = {
  fixedSections: true,
  pinnedFirstId: 'intro',
  pinnedLastId: 'sun',
  locks: {
    intro:  { lockType: true, lockPosition: true, lockDisable: true },
    saturn: { lockType: true, lockPosition: true, lockDisable: true },
    sun:    { lockType: true, lockPosition: true, lockDisable: true },
  },
  swappablePool: SOLARY_SWAPPABLE_POOL,
  mandatoryTypes: ['rsvpPlanet', 'giftPlanet'],
}

// Lovebirds: solary-style constrained model but lighter — add/remove allowed,
// capped at 10, hero pinned first + footer pinned last (locked by TYPE since
// add/remove generates fresh ids). registry/guestbook/countdown are excluded
// (folded/removed elsewhere).
const LOVEBIRDS_POOL = [
  'quote', 'ourStory', 'eventDetails', 'brideGroom', 'weddingParty',
  'galleryMasonry', 'gallerySpringCoil', 'schedule', 'rsvp', 'weddingGift',
  'accommodations', 'faq', 'playlist',
]

const lovebirdsPolicy: TemplatePolicy = {
  fixedSections: false,
  locks: {},
  swappablePool: LOVEBIRDS_POOL,
  maxSections: 10,
  anchorFirstType: 'hero',
  anchorLastType: 'footer',
  lockedTypes: ['hero', 'footer'],
  mandatoryTypes: ['rsvp', 'weddingGift'],
  swapGroups: {
    galleryMasonry: ['galleryMasonry', 'gallerySpringCoil'],
    gallerySpringCoil: ['galleryMasonry', 'gallerySpringCoil'],
  },
  // Fixed section set: couples may reorder, edit, swap the gallery, and
  // enable/disable, but never add or remove sections.
  lockSectionCount: true,
}

const policies: Record<string, TemplatePolicy> = {
  solary: solaryPolicy,
  lovebirds: lovebirdsPolicy,
}

export function getTemplatePolicy(template: string): TemplatePolicy | null {
  return policies[template] ?? null
}

/** True for a type pinned to an end (lovebirds hero/footer). */
export function isTypeAnchored(type: string, policy: TemplatePolicy): boolean {
  return policy.anchorFirstType === type || policy.anchorLastType === type
}

/** True for a type that cannot be removed or type-changed (lovebirds hero/footer). */
export function isTypeLockedFor(type: string, policy: TemplatePolicy): boolean {
  return !!policy.lockedTypes?.includes(type)
}

/** True for a type that must always be present and stays put (RSVP / Gift). */
export function isMandatoryType(type: string, policy: TemplatePolicy): boolean {
  return !!policy.mandatoryTypes?.includes(type)
}

/** Whether the "Add section" affordance should be offered at all. */
export function canAddSections(policy: TemplatePolicy | null): boolean {
  return !policy?.fixedSections && !policy?.lockSectionCount
}

/** Whether a given section TYPE may be removed (delete button). */
export function canRemoveSectionType(type: string, policy: TemplatePolicy | null): boolean {
  if (!policy) return true
  if (policy.fixedSections || policy.lockSectionCount) return false
  if (isTypeLockedFor(type, policy)) return false
  if (isMandatoryType(type, policy)) return false
  return true
}

/** Types offerable in the "add section" menu: in-pool, registered, not already used. */
export function availableAddTypes(
  registry: Record<string, unknown>,
  sections: { type: string }[],
  policy: TemplatePolicy | null,
): string[] {
  const used = expandUsedBySwapGroup(new Set(sections.map((s) => s.type)), policy)
  const pool = policy?.swappablePool ?? Object.keys(registry)
  return pool.filter((t) => !!registry[t] && !used.has(t))
}

/**
 * Expand a set of used types so that if any member of a swap-group is used,
 * ALL members of that group count as used. This makes an interchangeable group
 * (e.g. galleryMasonry/gallerySpringCoil) occupy a single slot — you can switch
 * between members but cannot create a second one elsewhere.
 */
export function expandUsedBySwapGroup(
  used: Set<string>,
  policy: TemplatePolicy | null,
): Set<string> {
  if (!policy?.swapGroups) return used
  const out = new Set(used)
  for (const t of used) {
    for (const sib of policy.swapGroups[t] ?? []) out.add(sib)
  }
  return out
}

/**
 * Types offerable in the "change type" dropdown: the current type first (so it
 * stays selected), then in-pool/registered types not used by any OTHER section.
 */
export function availableSwapTypes(
  registry: Record<string, unknown>,
  sections: { id: string; type: string }[],
  policy: TemplatePolicy | null,
  currentId: string,
  currentType: string,
): string[] {
  const usedElsewhere = expandUsedBySwapGroup(
    new Set(sections.filter((s) => s.id !== currentId).map((s) => s.type)),
    policy,
  )
  const group = policy?.swapGroups?.[currentType]
  // The current section's own group members are not "taken" by another section,
  // so a gallery can still swap to its sibling.
  if (group) for (const sib of group) usedElsewhere.delete(sib)
  const pool = group ?? policy?.swappablePool ?? Object.keys(registry)
  const rest = pool.filter((t) => !!registry[t] && t !== currentType && !usedElsewhere.has(t) && !policy?.mandatoryTypes?.includes(t))
  return [currentType, ...rest]
}

export function isPositionLocked(id: string, policy: TemplatePolicy): boolean {
  return !!policy.locks[id]?.lockPosition
}
export function isTypeLocked(id: string, policy: TemplatePolicy): boolean {
  return !!policy.locks[id]?.lockType
}

/**
 * Reorder by id while preserving every position-locked slot at its current
 * index. Returns the new id order, or null if the move is illegal (the
 * dragged slot is position-locked, or the result would shift any locked slot).
 */
export function computeSafeOrder(
  order: string[],
  activeId: string,
  overId: string,
  policy: TemplatePolicy,
  sections?: { id: string; type: string }[],
): string[] | null {
  if (activeId === overId) return null
  if (isPositionLocked(activeId, policy)) return null

  const typeOf = (id: string) => sections?.find((s) => s.id === id)?.type
  const activeType = typeOf(activeId)
  if (activeType && isMandatoryType(activeType, policy)) return null

  const from = order.indexOf(activeId)
  const to = order.indexOf(overId)
  if (from < 0 || to < 0) return null

  const next = order.slice()
  next.splice(from, 1)
  next.splice(to, 0, activeId)

  // Every position-locked slot must remain at the same index it had before.
  for (const [id, lock] of Object.entries(policy.locks)) {
    if (!lock.lockPosition) continue
    if (order.indexOf(id) !== next.indexOf(id)) return null
  }
  if (sections) {
    for (const s of sections) {
      if (!isMandatoryType(s.type, policy)) continue
      if (order.indexOf(s.id) !== next.indexOf(s.id)) return null
    }
  }
  return next
}
