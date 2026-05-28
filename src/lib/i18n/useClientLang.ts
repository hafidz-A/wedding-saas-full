'use client'
import { useEffect, useState } from 'react'
import { DEFAULT_LANG, LANG_COOKIE, normalizeLang, type Lang } from './config'

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
    const m = document.cookie.match(new RegExp('(?:^|; )' + LANG_COOKIE + '=([^;]+)'))
    setLang(normalizeLang(m ? decodeURIComponent(m[1]) : null))
  }, [])
  return lang
}
