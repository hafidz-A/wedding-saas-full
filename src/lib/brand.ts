/** Single source of truth for the customer-facing brand. */
export const BRAND = 'FinCards' as const
export const BRAND_PARTS = { lead: 'Fin', tail: 'Cards' } as const

/** Brand tagline. Split so the accent word can be highlighted at render
 *  (see SiteFooter); the flat string is used for metadata/OG. */
export const BRAND_TAGLINE = 'Designed to be remembered.' as const
export const BRAND_TAGLINE_PARTS = { lead: 'Designed to be ', accent: 'remembered', tail: '.' } as const

/** Official public social + contact channels (single source of truth). */
export const BRAND_INSTAGRAM_HANDLE = 'fincards.land' as const
export const BRAND_INSTAGRAM_URL = 'https://www.instagram.com/fincards.land' as const
/** WhatsApp business line 0851-1055-3938 as E.164 digits (no +) for wa.me deep links. */
export const BRAND_WHATSAPP_URL = 'https://wa.me/6285110553938' as const
