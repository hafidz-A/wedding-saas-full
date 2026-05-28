'use client'
import { useRouter } from 'next/navigation'
import { LANG_COOKIE, LANG_COOKIE_MAX_AGE, LANGS, type Lang } from '@/lib/i18n/config'
import styles from './LangToggle.module.css'

export function LangToggle({ lang, label }: { lang: Lang; label: string }) {
  const router = useRouter()

  function switchTo(next: Lang) {
    if (next === lang) return
    document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=${LANG_COOKIE_MAX_AGE}; samesite=lax`
    document.documentElement.lang = next
    router.refresh()
  }

  return (
    <div className={styles.toggle} role="group" aria-label={label}>
      {LANGS.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => switchTo(l)}
          aria-pressed={l === lang}
          className={`${styles.btn} ${l === lang ? styles.active : ''}`}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
