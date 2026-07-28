'use client'

import type { Dict } from '@/lib/i18n'
import styles from './Faq.module.css'

/* Native <details>/<summary> on purpose: an accordion is the one widget the
   platform already ships accessible and keyboard-operable, and this page pays
   a real price for every extra kilobyte of JS above the fold. */
export function Faq({ t }: { t: Dict['landing']['faq'] }) {
  return (
    <section className={styles.section} id="faq">
      <div className={styles.inner}>
        <span className={styles.eyebrow}>FAQ</span>
        <h2 className={styles.heading}>{t.heading}</h2>
        <div className={styles.list}>
          {t.items.map((item, i) => (
            <details key={i} className={styles.item} name="fincards-faq">
              <summary className={styles.question}>
                <span>{item.q}</span>
                <span className={styles.chevron} aria-hidden="true" />
              </summary>
              <p className={styles.answer}>{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
