/** Single source of truth for the customer-facing brand. */
export const BRAND = 'FinCards' as const
export const BRAND_PARTS = { lead: 'Fin', tail: 'Cards' } as const

/** Brand tagline. Split so the accent word can be highlighted at render
 *  (see SiteFooter); the flat string is used for metadata/OG. */
export const BRAND_TAGLINE = 'Designed to be remembered.' as const
export const BRAND_TAGLINE_PARTS = { lead: 'Designed to be ', accent: 'remembered', tail: '.' } as const
