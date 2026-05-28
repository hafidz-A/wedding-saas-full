'use client'
import Link from 'next/link'
import { templateCatalog } from '@/config/templateCatalog'
import type { Dict } from '@/lib/i18n'
import { useReveal } from '@/hooks/useReveal'
import styles from './TemplateShowcase.module.css'

export function TemplateShowcase({ t }: { t: Dict['landing']['showcase'] }) {
  const { ref, revealed } = useReveal<HTMLDivElement>()
  return (
    <section id="templates" className={styles.section}>
      <div className={`${styles.inner} ${revealed ? styles.revealed : ''}`} ref={ref}>
        <header className={styles.head}>
          <h2 className={styles.heading}>{t.heading}</h2>
          <p className={styles.subheading}>{t.subheading}</p>
        </header>
        <div className={styles.grid}>
          {templateCatalog.map((tpl) => {
            const copy = t.byTemplate[tpl.id as keyof typeof t.byTemplate]
            return (
              <article key={tpl.id} className={styles.card}>
                <div
                  className={styles.thumb}
                  style={{ background: `linear-gradient(150deg, ${tpl.accent} 0%, var(--color-charcoal) 100%)` }}
                >
                  <span className={styles.thumbName}>{tpl.label}</span>
                  <span className={styles.thumbTags}>{tpl.tags.join(' · ')}</span>
                </div>
                <div className={styles.body}>
                  <p className={styles.tagline} style={{ color: tpl.accent }}>{copy?.tagline}</p>
                  <p className={styles.desc}>{copy?.body}</p>
                  <div className={styles.actions}>
                    <Link href={`/${tpl.id}/${tpl.demoSlug}`} target="_blank" className={styles.preview}>
                      {t.previewCta} ↗
                    </Link>
                    <Link href={`/onboarding?template=${tpl.id}`} className={styles.use} style={{ background: tpl.accent }}>
                      {t.useCta} →
                    </Link>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
