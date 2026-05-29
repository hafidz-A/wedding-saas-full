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
}

const policies: Record<string, TemplatePolicy> = { solary: solaryPolicy }

export function getTemplatePolicy(template: string): TemplatePolicy | null {
  return policies[template] ?? null
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
