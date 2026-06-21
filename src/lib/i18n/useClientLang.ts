'use client'
import { useEffect, useState } from 'react'
import { DEFAULT_LANG, LANG_COOKIE, LANG_CHANGE_EVENT, normalizeLang, type Lang } from './config'

/**
 * Client-side language reader for pages that are pure client components
 * (e.g. forgot/reset/verify — they use useSearchParams and have no server
 * wrapper to call getLang). Renders DEFAULT_LANG on the server / first paint,
 * then syncs to the fin_lang cookie after mount. The brief id→en switch on
 * these low-traffic utility pages is an acceptable trade-off.
 */
export function useClientLang(): Lang {
  const [lang, setLang] = useState<Lang>(DEFAULT_LANG)
  useEffect(() => {
    const read = () => {
      const m = document.cookie.match(new RegExp('(?:^|; )' + LANG_COOKIE + '=([^;]+)'))
      setLang(normalizeLang(m ? decodeURIComponent(m[1]) : null))
    }
    read()
    // LangToggle dispatches this after writing the cookie. On pure client pages
    // router.refresh() doesn't re-run this hook, so without the event the toggle
    // would change the cookie but not the visible language until a reload.
    window.addEventListener(LANG_CHANGE_EVENT, read)
    return () => window.removeEventListener(LANG_CHANGE_EVENT, read)
  }, [])
  return lang
}
