'use client'

import { useState } from 'react'
import { useDashboardDict } from './DashboardI18nProvider'
import { getTutorialCategories, TUTORIAL_GROUPS, type TutorialCategory } from './tutorial/content'
import styles from './TutorialTab.module.css'

export default function TutorialTab({
  isPremium,
  template = 'lovebirds',
}: {
  isPremium: boolean
  template?: string
}) {
  const dict = useDashboardDict()
  // Screenshots live at public/tutorial/<template>/<key>.png.
  const SHOT_BASE = `/tutorial/${template}`
  // The tutorial copy tree is hand-authored; index it loosely by category id.
  // Solary keeps its own copy under tutorial.solary.*, with headings/navTitle shared.
  const root = (dict.tabs as any).tutorial
  const t = template === 'solary' && root.solary ? { ...root, ...root.solary } : root
  const cats = getTutorialCategories(template).filter((c) => !c.premiumOnly || isPremium)
  const [active, setActive] = useState<string>(cats[0]?.id ?? 'start')
  const cat = cats.find((c) => c.id === active) ?? cats[0]
  const c = t[cat.id]

  const list = (n: number, arr: string[] | undefined): string[] =>
    Array.from({ length: n }, (_, i) => arr?.[i]).filter(Boolean) as string[]

  const grouped = cats.some((x) => x.group)

  const renderTab = (x: TutorialCategory) => (
    <button
      key={x.id}
      className={`${styles.subtab} ${x.id === active ? styles.subtabActive : ''}`}
      onClick={() => setActive(x.id)}
    >
      {t[x.id]?.title ?? x.id}
    </button>
  )

  return (
    <div className={styles.wrap}>
      <nav className={styles.subnav}>
        {grouped
          ? TUTORIAL_GROUPS.map((g) => {
              const inGroup = cats.filter((x) => x.group === g)
              if (!inGroup.length) return null
              return (
                <div key={g} className={styles.group}>
                  <span className={styles.groupLabel}>{t.groups?.[g] ?? g}</span>
                  <div className={styles.groupTabs}>{inGroup.map(renderTab)}</div>
                </div>
              )
            })
          : cats.map(renderTab)}
      </nav>

      {c && (
        <>
          <h2 className={styles.title}>{c.title}</h2>
          <p className={styles.summary}>{c.summary}</p>

          {cat.shots[0] && <Shot cat={cat} c={c} index={0} base={SHOT_BASE} />}

          {cat.stepCount > 0 && (
            <>
              <p className={styles.h}>{t.headings.steps}</p>
              <ol className={styles.steps}>
                {list(cat.stepCount, c.steps).map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            </>
          )}

          {cat.sectionGuideCount ? <SectionGuides cat={cat} c={c} t={t} /> : null}
          {cat.faqCount ? <Faqs cat={cat} c={c} /> : null}

          {cat.shots.slice(1).map((_, i) => (
            <Shot key={i + 1} cat={cat} c={c} index={i + 1} base={SHOT_BASE} />
          ))}

          <Block title={t.headings.always} cls={styles.always} items={list(cat.alwaysCount, c.always)} />
          <Block title={t.headings.never} cls={styles.never} items={list(cat.neverCount, c.never)} />
          {cat.tipCount > 0 && (
            <Block title={t.headings.tips} cls={styles.tips} items={list(cat.tipCount, c.tips)} />
          )}
        </>
      )}
    </div>
  )
}

function Block({ title, cls, items }: { title: string; cls: string; items: string[] }) {
  if (!items.length) return null
  return (
    <>
      <p className={styles.h}>{title}</p>
      <ul className={`${styles.bullets} ${cls}`}>
        {items.map((x, i) => (
          <li key={i}>{x}</li>
        ))}
      </ul>
    </>
  )
}

function SectionGuides({ cat, c, t }: { cat: TutorialCategory; c: any; t: any }) {
  const n = cat.sectionGuideCount ?? 0
  const cards = Array.from({ length: n }, (_, i) => c.sectionGuides?.[i]).filter(Boolean)
  if (!cards.length) return null
  return (
    <div className={styles.guideList}>
      {cards.map((g: any, i: number) => (
        <div key={i} className={styles.guideCard}>
          <h3 className={styles.guideTitle}>{g.title}</h3>
          <p className={styles.guideRow}>
            <span className={styles.guideLabel}>👁 {t.headings.sees}</span> {g.sees}
          </p>
          <p className={styles.guideRow}>
            <span className={styles.guideLabel}>✍️ {t.headings.fill}</span> {g.fill}
          </p>
          <p className={styles.guideRow}>
            <span className={styles.guideLabel}>⚠️ {t.headings.watch}</span> {g.watch}
          </p>
        </div>
      ))}
    </div>
  )
}

function Faqs({ cat, c }: { cat: TutorialCategory; c: any }) {
  const n = cat.faqCount ?? 0
  const items = Array.from({ length: n }, (_, i) => c.faqs?.[i]).filter(Boolean)
  if (!items.length) return null
  return (
    <div className={styles.faqList}>
      {items.map((f: any, i: number) => (
        <details key={i} className={styles.faqItem}>
          <summary className={styles.faqQ}>{f.q}</summary>
          <p className={styles.faqA}>{f.a}</p>
        </details>
      ))}
    </div>
  )
}

function Shot({ cat, c, index, base }: { cat: TutorialCategory; c: any; index: number; base: string }) {
  const shot = cat.shots[index]
  if (!shot) return null
  const caption: string | undefined = c.shots?.[shot.captionKey]
  return (
    <figure className={styles.shot}>
      <img
        src={`${base}/${shot.key}.png`}
        alt={caption ?? ''}
        loading="lazy"
        onError={(e) => {
          const fig = e.currentTarget.closest('figure') as HTMLElement | null
          if (fig) fig.style.display = 'none'
        }}
      />
      {caption && <figcaption className={styles.shotCap}>{caption}</figcaption>}
    </figure>
  )
}
