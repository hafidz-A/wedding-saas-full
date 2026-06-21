export type Lang = 'id' | 'en'

export const LANGS: readonly Lang[] = ['id', 'en'] as const
export const DEFAULT_LANG: Lang = 'id'
export const LANG_COOKIE = 'fin_lang'
export const LANG_COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year
/** Window event LangToggle fires after writing the cookie, so pure client
 *  pages (forgot/reset) that read the lang via useClientLang can re-render. */
export const LANG_CHANGE_EVENT = 'fin-langchange'

export function normalizeLang(value: string | undefined | null): Lang {
  return value === 'en' ? 'en' : 'id'
}
