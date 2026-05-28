import 'server-only'
import { cookies } from 'next/headers'
import { LANG_COOKIE, normalizeLang, type Lang } from './config'

/** Server-only. Reads the fin_lang cookie; defaults to 'id'. */
export function getLang(): Lang {
  return normalizeLang(cookies().get(LANG_COOKIE)?.value)
}
