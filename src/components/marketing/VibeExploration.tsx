'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'motion/react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import type { Dict } from '@/lib/i18n'
import { type PlanDisplay } from '@/lib/payments/plan-display'
import { templateCopy, type TemplateDisplay } from '@/lib/templates/display'
import { getCatalogEntry } from '@/config/templateCatalog'
import { useReveal } from '@/hooks/useReveal'
import { TEMPLATE_VIBES } from './vibeData'
import { CATEGORIES, DEFAULT_CATEGORY, categoryLabel } from '@/config/categories'
import { VibeBackdrop } from './VibeBackdrop'
import { PreviewMock } from './PreviewMock'
import { VibePlanCard } from './VibePlanCard'
import { readableOn } from '@/lib/color'
import styles from './VibeExploration.module.css'

type VibeDict = Dict['landing']['vibeExploration']

export function VibeExploration({ lang, t, plans, templates }: { lang: 'id' | 'en'; t: VibeDict; plans?: Record<string, PlanDisplay[]>; templates?: TemplateDisplay[] }) {
  const { ref } = useReveal<HTMLDivElement>()
  const innerRef = useRef<HTMLDivElement>(null)
  const [pinned, setPinned] = useState(false)
  const [category, setCategory] = useState(DEFAULT_CATEGORY)
  const [templateIndex, setTemplateIndex] = useState(0)
  const [paletteIndex, setPaletteIndex] = useState(0)
  const [plansOpen, setPlansOpen] = useState(false)

  // Pin the section and scrub its content: the user scrolls through ALL of the
  // content (however tall) while the cosmic/botanical backdrop stays put, and
  // only then does the page continue to the next section. Desktop + motion only;
  // on mobile / reduced-motion the section is a normal, fully-scrollable block
  // (so nothing is ever clipped).
  useEffect(() => {
    if (typeof window === 'undefined') return
    const section = ref.current
    const inner = innerRef.current
    if (!section || !inner) return
    const desktop = window.matchMedia('(min-width: 1024px)')
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (!desktop.matches || reduce.matches) return

    gsap.registerPlugin(ScrollTrigger)

    const overflow = () => {
      const cs = getComputedStyle(section)
      const padV = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom)
      return Math.max(0, inner.scrollHeight - (window.innerHeight - padV))
    }

    let st: ScrollTrigger | undefined
    const build = () => {
      st?.kill()
      gsap.set(inner, { clearProps: 'transform' })
      if (overflow() <= 4) {
        setPinned(false)
        return
      }
      setPinned(true)
      // Pin the section and scrub its content: the user scrolls through ALL of
      // the content while it stays pinned; the pin releases exactly when the
      // content is finished, then the next section takes over.
      const tween = gsap.to(inner, {
        y: () => -overflow(),
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: () => '+=' + overflow(),
          scrub: 0.6,
          pin: true,
          pinSpacing: true,
          invalidateOnRefresh: true,
        },
      })
      st = tween.scrollTrigger
    }
    build()

    return () => {
      st?.kill()
      gsap.set(inner, { clearProps: 'transform' })
      setPinned(false)
    }
  }, [])

  // Content height changes (template/palette switch, plans toggle) → recompute.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const id = window.setTimeout(() => ScrollTrigger.refresh(), 60)
    return () => window.clearTimeout(id)
  }, [templateIndex, paletteIndex, plansOpen, category])

  // Effective template list: DB display data (enabled, sort order, category, label,
  // tagline/blurb) merged with the code palettes (which stay in vibeData). Falls
  // back to code + i18n when no DB templates were passed (or on a DB blip).
  const effective = useMemo(() => {
    const byId = new Map(TEMPLATE_VIBES.map((v) => [v.id as string, v]))
    if (templates && templates.length) {
      return templates
        .filter((dt) => dt.enabled && byId.has(dt.id))
        .map((dt) => {
          const v = byId.get(dt.id)!
          const copy = templateCopy(dt, lang)
          return { id: v.id, label: dt.label || v.label, category: dt.category || v.category, demoSlug: v.demoSlug, palettes: v.palettes, tagline: copy.tagline, blurb: copy.blurb }
        })
    }
    return TEMPLATE_VIBES.map((v) => ({ id: v.id, label: v.label, category: v.category, demoSlug: v.demoSlug, palettes: v.palettes, tagline: t.byTemplate[v.id]?.tagline ?? '', blurb: t.byTemplate[v.id]?.blurb ?? '' }))
  }, [templates, lang, t])

  // Categories that actually have at least one (enabled) template.
  const activeCategories = useMemo(() => new Set(effective.map((tpl) => tpl.category)), [effective])
  const filtered = useMemo(() => effective.filter((tpl) => tpl.category === category), [effective, category])

  const safeIndex = Math.min(templateIndex, Math.max(0, filtered.length - 1))
  const template = filtered[safeIndex] ?? effective[0]
  const palette = template?.palettes[paletteIndex] ?? template?.palettes[0]
  const isDark = palette?.mode === 'dark'

  const switchTemplate = (next: number) => {
    const len = filtered.length
    if (len === 0) return
    setTemplateIndex(((next % len) + len) % len)
    setPaletteIndex(0)
    setPlansOpen(false)
  }

  const switchCategory = (id: string) => {
    if (!activeCategories.has(id) || id === category) return
    setCategory(id)
    setTemplateIndex(0)
    setPaletteIndex(0)
    setPlansOpen(false)
  }

  const accentText = useMemo(() => readableOn(palette?.accent ?? '#E8553E'), [palette?.accent])

  // All templates disabled → graceful empty state (placed AFTER every hook).
  if (!template || !palette) {
    return (
      <section id="vibe" ref={ref} className={styles.section}>
        <div style={{ padding: '96px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
          {lang === 'id' ? 'Template segera hadir.' : 'Templates coming soon.'}
        </div>
      </section>
    )
  }

  const catalog = getCatalogEntry(template.id)
  const displayPlans: PlanDisplay[] =
    plans?.[template.id] ??
    (catalog.plans ?? []).map((pl: any) => ({
      id: pl.id, name: pl.name, price: pl.price, amountIDR: pl.amountIDR ?? 0,
      compareAtPrice: null, features: pl.features ?? [], baseQuota: 200,
    }))
  const previewHref = `/${template.id}/${template.demoSlug}`
  const buyHref = `/onboarding?template=${template.id}`

  return (
    <section
      id="vibe"
      ref={ref}
      className={`${styles.section} ${isDark ? styles.dark : ''} ${pinned ? styles.pinned : ''}`}
    >
      {/* Background + backdrop, masked so the section fades in/out softly at its
          top & bottom edges (no hard seam against the neighbouring sections). */}
      <div className={styles.bgWrap} aria-hidden="true">
        {/* Cross-fading palette background — CSS can't tween gradients, so we
            fade a fresh full-bleed layer in over the previous one. */}
        <AnimatePresence>
          <motion.div
            key={`${template.id}-${palette.key}-bg`}
            className={styles.bgLayer}
            style={{ background: palette.background }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: 'easeInOut' }}
          />
        </AnimatePresence>

        {/* Real template backdrop (perched birds + flowers / Andromeda + stars),
            recoloured by the active palette. */}
        <VibeBackdrop template={template.id} palette={palette} />
      </div>

      <div ref={innerRef} className={styles.inner}>
        <header className={styles.head}>
          <span className={styles.kicker} style={{ color: palette.accent }}>
            {t.heading}
          </span>
          <h2 className={styles.heading} style={{ color: palette.fg }}>
            {t.subheading}
          </h2>

          {/* Category picker — filters the template carousel in place. Categories
              with no template yet show as disabled "coming soon" chips. */}
          <div
            role="tablist"
            aria-label="Category"
            style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 22 }}
          >
            {CATEGORIES.map((c) => {
              const has = activeCategories.has(c.id)
              const selected = c.id === category && has
              return (
                <button
                  key={c.id}
                  type="button"
                  role="tab"
                  disabled={!has}
                  aria-selected={selected}
                  onClick={() => switchCategory(c.id)}
                  style={{
                    padding: '7px 16px',
                    borderRadius: 'var(--radius-pill)',
                    fontSize: 13,
                    fontWeight: 600,
                    letterSpacing: '0.04em',
                    cursor: has ? 'pointer' : 'not-allowed',
                    border: `1px solid ${selected ? palette.accent : palette.surfaceBorder}`,
                    background: selected ? `${palette.accent}1f` : 'transparent',
                    color: selected ? palette.accent : palette.fgMuted,
                    opacity: has ? 1 : 0.5,
                    transition: 'all 0.2s ease',
                  }}
                >
                  {categoryLabel(c.id, lang)}
                  {!has && (
                    <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.85 }}>
                      · {lang === 'id' ? 'Segera' : 'Soon'}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </header>

        {/* Template carousel */}
        <div className={styles.carousel}>
          <button
            type="button"
            className={styles.arrow}
            style={{ color: palette.fg, borderColor: palette.surfaceBorder }}
            aria-label={t.prevTemplate}
            onClick={() => switchTemplate(templateIndex - 1)}
          >
            ‹
          </button>
          <div className={styles.carouselCenter}>
            <span className={styles.carouselEyebrow} style={{ color: palette.fgMuted }}>
              {t.templateEyebrow}
            </span>
            <AnimatePresence mode="wait">
              <motion.span
                key={template.id}
                className={styles.carouselName}
                style={{ color: palette.fg }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              >
                {template.label}
              </motion.span>
            </AnimatePresence>
            <span className={styles.dots} aria-hidden="true">
              {filtered.map((tpl, i) => (
                <span
                  key={tpl.id}
                  className={styles.dot}
                  style={{
                    background: i === safeIndex ? palette.accent : palette.surfaceBorder,
                    width: i === safeIndex ? 22 : 7,
                  }}
                />
              ))}
            </span>
          </div>
          <button
            type="button"
            className={styles.arrow}
            style={{ color: palette.fg, borderColor: palette.surfaceBorder }}
            aria-label={t.nextTemplate}
            onClick={() => switchTemplate(templateIndex + 1)}
          >
            ›
          </button>
        </div>

        <div className={styles.layout}>
          {/* Palette menu */}
          <div className={styles.menuWrap}>
            <span className={styles.menuLabel} style={{ color: palette.fgMuted }}>
              {t.paletteLabel}
            </span>
            <div className={styles.menu}>
              {template.palettes.map((p, i) => {
                const selected = i === paletteIndex
                return (
                  <button
                    key={p.key}
                    type="button"
                    className={`${styles.menuBtn} ${selected ? styles.menuBtnSelected : ''}`}
                    aria-pressed={selected}
                    onClick={() => {
                      setPaletteIndex(i)
                      setPlansOpen(false)
                    }}
                    style={{
                      color: selected ? p.accent : palette.fgMuted,
                      borderColor: selected ? p.accent : palette.surfaceBorder,
                      background: selected ? `${p.accent}1a` : 'transparent',
                    }}
                  >
                    <span className={styles.bullet} style={{ background: p.accent }} />
                    {p.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Display: preview mockup + details. The card is PERSISTENT — it
              re-colours via CSS transitions so its backdrop-filter blur never
              snaps; only the detail text cross-fades on palette switch. */}
          <div className={styles.display}>
            <div className={styles.displayInner}>
              <PreviewMock
                templateId={template.id}
                palette={palette}
                eyebrow={t.previewEyebrow}
                names={t.previewNames}
                date={t.previewDate}
              />

              <AnimatePresence mode="wait">
                <motion.div
                  key={`${template.id}-${palette.key}`}
                  className={styles.details}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                >
                  <span className={styles.tagline} style={{ color: palette.accent }}>
                    {template.tagline}
                  </span>
                  <h3 className={styles.paletteName} style={{ color: palette.fg }}>
                    {palette.label}
                  </h3>
                  <p className={styles.blurb} style={{ color: palette.fgMuted }}>
                    {template.blurb}
                  </p>

                  <div className={styles.ambience}>
                    <span className={styles.ambienceLabel} style={{ color: palette.fgMuted }}>
                      {t.ambienceLabel}
                    </span>
                    <div className={styles.swatches}>
                      {palette.swatches.map((c, i) => (
                        <span
                          key={i}
                          className={styles.swatch}
                          style={{ background: c, borderColor: palette.surfaceBorder }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className={styles.actions}>
                    <Link
                      href={previewHref}
                      target="_blank"
                      rel="noreferrer"
                      className={styles.btnGhost}
                      style={{ color: palette.fg, borderColor: palette.accent }}
                    >
                      {t.liveReview}
                      {/* Inline SVG, not the ↗ glyph: U+2197 falls back to the
                          emoji font on many phones, breaking the elegant look. */}
                      <svg
                        viewBox="0 0 24 24"
                        width="13"
                        height="13"
                        aria-hidden="true"
                        style={{ flexShrink: 0 }}
                      >
                        <path
                          d="M6 18 18 6M9 6h9v9"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </Link>
                    <button
                      type="button"
                      className={styles.btnPrimary}
                      style={{ background: palette.accent, color: accentText }}
                      aria-expanded={plansOpen}
                      onClick={() => setPlansOpen((v) => !v)}
                    >
                      {t.buy}
                      <span
                        aria-hidden="true"
                        className={`${styles.btnCaret} ${plansOpen ? styles.btnCaretOpen : ''}`}
                      >
                        ↓
                      </span>
                    </button>
                  </div>

                  {/* Inline plans */}
                  <AnimatePresence initial={false}>
                    {plansOpen && (
                      <motion.div
                        className={styles.plans}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                      >
                        <span className={styles.plansTitle} style={{ color: palette.fgMuted }}>
                          {t.plansTitle}
                        </span>
                        <div className={styles.planGrid}>
                          {displayPlans.map((pl) => (
                            <VibePlanCard
                              key={pl.id}
                              plan={pl}
                              buyHref={buyHref}
                              chooseLabel={t.choosePlan}
                              quotaLabel={t.guestQuota}
                              accentText={accentText}
                              palette={palette}
                              styles={styles}
                              onQuotaChange={() => { setTimeout(() => ScrollTrigger.refresh(), 60) }}
                            />
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
