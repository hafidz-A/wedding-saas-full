'use client'

import type { Dict } from '@/lib/i18n'
import { BRAND_WHATSAPP_URL } from '@/lib/brand'
import styles from './TrustBar.module.css'

/* Sits directly under the hero, where the "is this legit?" doubt actually
   lands. Every claim here is verifiable in the product — one-time Midtrans
   payment, guests encrypted at rest, a real support line. Nothing aspirational:
   an unearned trust badge costs more credibility than it buys. */
export function TrustBar({ t }: { t: Dict['landing']['trustBar'] }) {
  return (
    <section className={styles.section} aria-label={t.label}>
      <ul className={styles.list}>
        <li className={styles.item}>
          <Icon path="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          <span>{t.oneTime}</span>
        </li>
        <li className={styles.item}>
          <Icon path="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <span>{t.payment}</span>
        </li>
        <li className={styles.item}>
          <Icon path="M5 11V7a7 7 0 0 1 14 0v4M4 11h16v10H4z" />
          <span>{t.encrypted}</span>
        </li>
        <li className={styles.item}>
          <Icon path="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.5 8.5 0 0 1-3.9-.9L3 21l1.9-5a8.4 8.4 0 0 1-.9-3.9 8.4 8.4 0 0 1 8.4-9 8.4 8.4 0 0 1 8.6 8.4z" />
          <a className={styles.link} href={BRAND_WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
            {t.support}
          </a>
        </li>
      </ul>
    </section>
  )
}

function Icon({ path }: { path: string }) {
  return (
    <svg className={styles.icon} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d={path} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
