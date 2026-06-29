/**
 * Couple-name single source of truth.
 *
 * `config.couple = { name1, name2 }` is the canonical home for the couple's
 * names. Everything else (Hero/Footer/OpeningGate props, navbar brand, SEO
 * title) derives from it via these helpers.
 */

export interface CoupleData {
  name1?: string
  name2?: string
}

const clean = (s: string | null | undefined): string => (s ?? '').replace(/\s+/g, ' ').trim()

/** "Amara & Rizky" — empty sides dropped, no dangling separator. */
export function coupleDisplay(c: CoupleData | null | undefined): string {
  const cc = c ?? {}
  return [cc.name1, cc.name2].map(clean).filter(Boolean).join(' & ')
}

/** SEO/share title: "Amara & Rizky — Our Wedding" (suffix optional). */
export function composeTitle(c: CoupleData | null | undefined, suffix?: string | null): string {
  const names = coupleDisplay(c)
  const s = clean(suffix)
  if (!s) return names
  return names ? `${names} — ${s}` : s
}

/** Best-effort split of a legacy stored title back into structured parts. */
export function parseCoupleFromTitle(title?: string | null): { name1: string; name2: string; titleSuffix: string } {
  const raw = clean(title)
  const dash = raw.indexOf('—')
  const namesPart = dash >= 0 ? raw.slice(0, dash) : raw
  const titleSuffix = dash >= 0 ? clean(raw.slice(dash + 1)) : ''
  const parts = namesPart.split('&').map((p) => p.trim()).filter(Boolean)
  return { name1: parts[0] ?? '', name2: parts.slice(1).join(' & '), titleSuffix }
}

export function hasCouple(c: CoupleData | null | undefined): boolean {
  return coupleDisplay(c).length > 0
}

/** Navbar brand: canonical couple first, then legacy meta.title parse, then fallback. */
export function navName(
  config: { couple?: CoupleData | null; meta?: { title?: string } | null } | null | undefined,
  fallback = 'Wedding',
): string {
  const cfg = config ?? {}
  const display = coupleDisplay(cfg.couple)
  if (display) return display
  const fromTitle = clean(cfg.meta?.title?.split('—')[0])
  return fromTitle || fallback
}

// Section types that consume the couple's names.
const COUPLE_TYPES = new Set(['hero', 'footer', 'openingGate'])

/**
 * Inject canonical couple names into a section's props at render time, unless the
 * section opted out (`props.coupleOverride`). Returns the props object to spread.
 * Pure — no mutation of the input. When couple is empty, returns props unchanged
 * (legacy invitations keep their stored per-section copies).
 */
export function injectCoupleProps(
  section: { type: string; props?: Record<string, unknown> | null } | null | undefined,
  couple?: CoupleData | null,
): Record<string, unknown> {
  const props = { ...((section?.props as Record<string, unknown>) || {}) }
  if (!section || props.coupleOverride) return props
  if (!COUPLE_TYPES.has(section.type)) return props
  const display = coupleDisplay(couple)
  if (!display) return props
  const name1 = clean(couple?.name1)
  const name2 = clean(couple?.name2)
  if (section.type === 'hero') {
    if (name1) props.brideName = name1
    if (name2) props.groomName = name2
    props.coupleName = display
  } else {
    props.coupleName = display
  }
  return props
}

/** Seed config.couple for a config that predates it (editor prefill). */
export function deriveCoupleFromConfig(
  config: {
    couple?: CoupleData | null
    sections?: Array<{ type: string; props?: Record<string, any> | null }> | null
    meta?: { title?: string } | null
  } | null | undefined,
): CoupleData {
  const cfg = config ?? {}
  if (hasCouple(cfg.couple)) return cfg.couple
  const hero = cfg.sections?.find((s) => s.type === 'hero')?.props || undefined
  if (hero?.brideName || hero?.groomName) {
    return { name1: clean(hero.brideName), name2: clean(hero.groomName) }
  }
  if (hero?.coupleName) {
    const p = parseCoupleFromTitle(String(hero.coupleName))
    return { name1: p.name1, name2: p.name2 }
  }
  const p = parseCoupleFromTitle(cfg.meta?.title)
  return { name1: p.name1, name2: p.name2 }
}
