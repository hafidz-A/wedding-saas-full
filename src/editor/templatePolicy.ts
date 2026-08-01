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
  swapGroups?: Record<string, string[]> // type -> the only types it may swap with (incl. itself)
  lockSectionCount?: boolean    // fixed section count: no add + no remove (lovebirds). drag/edit/swap still allowed
  confirmDisableTypes?: string[] // types whose disable prompts a confirm (they collect guest data)
}

// saturnRing is deliberately ABSENT from this pool: the Saturn slot is type-locked
// (see `locks.saturn`), so nothing swaps into or out of it. If that type lock is
// ever lifted, saturnRing MUST be added here in the same change — otherwise
// swapping the gallery away becomes a one-way door that permanently destroys the
// Solary gallery slot, since nothing could ever swap back into it.
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
    // The Saturn gallery's photo ring is parented to the Saturn group in the 3D
    // scene, so the slot stays position- AND type-locked — moving or swapping it
    // would orbit the photos off-camera. Deliberately NO lockDisable: couples may
    // switch the gallery off, which skips Saturn on the journey (uranus → jupiter)
    // while the planet itself stays in the solar system.
    saturn: { lockType: true, lockPosition: true },
    sun:    { lockType: true, lockPosition: true, lockDisable: true },
  },
  swappablePool: SOLARY_SWAPPABLE_POOL,
  confirmDisableTypes: ['rsvpPlanet', 'giftPlanet'],
}

// Lovebirds: solary-style constrained model but lighter — add/remove allowed,
// capped at 10, hero pinned first + footer pinned last (locked by TYPE since
// add/remove generates fresh ids). registry/guestbook/countdown are excluded
// (folded/removed elsewhere).
const LOVEBIRDS_POOL = [
  'quote', 'ourStory', 'eventDetails', 'brideGroom', 'weddingParty',
  'galleryMasonry', 'gallerySpringCoil', 'schedule', 'rsvp', 'weddingGift',
  'accommodations', 'faq',
]

const lovebirdsPolicy: TemplatePolicy = {
  fixedSections: false,
  locks: {},
  swappablePool: LOVEBIRDS_POOL,
  maxSections: 10,
  anchorFirstType: 'hero',
  anchorLastType: 'footer',
  lockedTypes: ['hero', 'footer'],
  swapGroups: {
    galleryMasonry: ['galleryMasonry', 'gallerySpringCoil'],
    gallerySpringCoil: ['galleryMasonry', 'gallerySpringCoil'],
  },
  // Fixed section set: couples may reorder, edit, swap the gallery, and
  // enable/disable, but never add or remove sections.
  lockSectionCount: true,
  confirmDisableTypes: ['rsvp', 'weddingGift'],
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

/** True for a type whose disable action should prompt a confirm dialog
 *  because it collects guest data (RSVP / Gift). */
export function needsDisableConfirm(type: string, policy: TemplatePolicy | null): boolean {
  return !!policy?.confirmDisableTypes?.includes(type)
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
  const rest = pool.filter((t) => !!registry[t] && t !== currentType && !usedElsewhere.has(t))
  return [currentType, ...rest]
}

export interface PolicyViolation {
  code: 'missing_locked_type' | 'missing_locked_slot' | 'too_many' | 'count_changed'
  message: string
}

/**
 * Server-side guard that mirrors the editor's structural constraints. The editor
 * UI already enforces these, but the PUT /config route must NOT trust the client:
 * a crafted request could otherwise blow past the section cap or delete a locked
 * anchor (hero/footer, intro/sun). Returns the FIRST violation found, or null
 * when `nextSections` satisfies the policy.
 *
 *   - locked-by-type anchors (lovebirds hero/footer) must survive
 *   - position-locked slots by id (solary intro/sun) must survive
 *   - fixed-count templates (fixedSections / lockSectionCount): the section count
 *     may not change relative to the previously-saved config (no add/remove)
 *   - cap-only templates (maxSections without a fixed count): never exceed the cap
 *
 * `prevSections` is the section list currently persisted (null on first save).
 */
export function validateSectionsAgainstPolicy(
  template: string | null | undefined,
  nextSections: { id?: string; type?: string }[],
  prevSections: { id?: string; type?: string }[] | null,
): PolicyViolation | null {
  const policy = template ? getTemplatePolicy(template) : null
  if (!policy) return null

  for (const t of policy.lockedTypes ?? []) {
    if (!nextSections.some((s) => s.type === t)) {
      return { code: 'missing_locked_type', message: `Section terkunci "${t}" tidak boleh dihapus.` }
    }
  }
  for (const [id, lock] of Object.entries(policy.locks)) {
    if (!(lock.lockPosition || lock.lockType || lock.lockDisable)) continue
    if (!nextSections.some((s) => s.id === id)) {
      return { code: 'missing_locked_slot', message: `Section terkunci "${id}" tidak boleh dihapus.` }
    }
  }

  const fixedCount = policy.fixedSections || policy.lockSectionCount
  if (fixedCount) {
    // No add/remove. The cap is implied by the fixed count, so we compare to the
    // saved config rather than maxSections (default configs may legitimately
    // exceed maxSections, which only governs the "add section" affordance).
    if (prevSections && nextSections.length !== prevSections.length) {
      return { code: 'count_changed', message: 'Jumlah section tidak boleh ditambah atau dikurangi.' }
    }
  } else if (policy.maxSections != null && nextSections.length > policy.maxSections) {
    return { code: 'too_many', message: `Maksimal ${policy.maxSections} section.` }
  }

  return null
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
): string[] | null {
  if (activeId === overId) return null
  if (isPositionLocked(activeId, policy)) return null

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
  return next
}

/**
 * A slot that cannot take part in a swap: position-locked by id, or anchored
 * by type (lovebirds hero/footer). This is exactly the inverse of
 * SectionRow's `draggable` gate.
 */
export function isSlotFixed(
  section: { id: string; type: string },
  policy: TemplatePolicy,
): boolean {
  if (isPositionLocked(section.id, policy)) return true
  if (isTypeAnchored(section.type, policy)) return true
  return false
}

/**
 * Swap two slots by id. Returns the new id order, or null if the swap is
 * illegal: active === over, an id is missing, or EITHER endpoint is a fixed
 * slot. Because only the two endpoints move, any locked card BETWEEN them
 * stays at its index — which is what lets a swap cross a locked anchor.
 */
export function computeSwapOrder(
  order: string[],
  activeId: string,
  overId: string,
  policy: TemplatePolicy,
  sections: { id: string; type: string }[],
): string[] | null {
  if (activeId === overId) return null
  const active = sections.find((s) => s.id === activeId)
  const over = sections.find((s) => s.id === overId)
  if (!active || !over) return null
  if (isSlotFixed(active, policy) || isSlotFixed(over, policy)) return null
  const from = order.indexOf(activeId)
  const to = order.indexOf(overId)
  if (from < 0 || to < 0) return null
  const next = order.slice()
  ;[next[from], next[to]] = [next[to], next[from]]
  return next
}
