'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence, useScroll, useTransform } from 'motion/react'
import { templateCatalog } from '@/config/templateCatalog'
import type { Dict } from '@/lib/i18n'
import { useReveal } from '@/hooks/useReveal'
import styles from './TemplateShowcase.module.css'

export function TemplateShowcase({ t }: { t: Dict['landing']['showcase'] }) {
  const { ref, revealed } = useReveal<HTMLDivElement>()
  const [loadingTemplate, setLoadingTemplate] = useState<string | null>(null)

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start']
  })
  const floralY = useTransform(scrollYProgress, [0, 1], [-80, 80])

  function handlePreviewClick(templateId: string) {
    setLoadingTemplate(templateId)
    // The link will navigate in a new tab; we clear the loading overlay after a delay.
    setTimeout(() => {
      setLoadingTemplate(null)
    }, 2800)
  }

  return (
    <section id="templates" className={styles.section} ref={ref}>
      {/* Floating Parallax Floral Ornaments */}
      <motion.div
        className={styles.floatingFloral}
        style={{ y: floralY }}
        aria-hidden="true"
      >
        <img src="/images/luxury_gold_floral.png" alt="" />
      </motion.div>

      {/* Route Preview Transition Loader */}
      <AnimatePresence>
        {loadingTemplate && (
          <motion.div
            className={`${styles.transitionOverlay} ${
              loadingTemplate === 'solary' ? styles.overlaySolary : styles.overlayLovebirds
            }`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            {/* Dynamic Background Assets from template themes */}
            {loadingTemplate === 'lovebirds' ? (
              <div className={styles.transitionBackground} aria-hidden="true">
                <svg className={`${styles.cornerOrn} ${styles.topRight}`} viewBox="0 0 200 200">
                  <path d="M 12 100 Q 60 100 100 60 T 188 12" stroke="#C89A1F" strokeWidth="1" fill="none" opacity="0.4" />
                  <path d="M 12 130 Q 70 130 120 80 T 188 40" stroke="#E8553E" strokeWidth="0.8" fill="none" opacity="0.3" />
                  <circle cx="12" cy="100" r="3" fill="#F5C842" />
                  <circle cx="188" cy="12" r="3" fill="#E8553E" />
                </svg>
                <svg className={`${styles.cornerOrn} ${styles.bottomLeft}`} viewBox="0 0 200 200">
                  <path d="M 12 100 Q 60 100 100 60 T 188 12" stroke="#2D8C4E" strokeWidth="1" fill="none" opacity="0.4" />
                  <path d="M 12 130 Q 70 130 120 80 T 188 40" stroke="#6B35A8" strokeWidth="0.8" fill="none" opacity="0.3" />
                  <circle cx="12" cy="100" r="3" fill="#2D8C4E" />
                  <circle cx="188" cy="12" r="3" fill="#6B35A8" />
                </svg>
                {/* Floating floral petals */}
                <div className={styles.floatingPetals}>
                  <div className={`${styles.rosePetal} ${styles.rosePetal1}`} />
                  <div className={`${styles.rosePetal} ${styles.rosePetal2}`} />
                  <div className={`${styles.rosePetal} ${styles.rosePetal3}`} />
                </div>
              </div>
            ) : (
              <div className={styles.transitionBackground} aria-hidden="true">
                <div className={styles.starryBg} />
                <div className={styles.nebulaWash} />
                <svg className={styles.constellation} viewBox="0 0 100 100">
                  <line x1="10" y1="20" x2="33" y2="45" stroke="rgba(168, 213, 227, 0.25)" strokeWidth="0.4" />
                  <line x1="33" y1="45" x2="68" y2="30" stroke="rgba(168, 213, 227, 0.25)" strokeWidth="0.4" />
                  <line x1="68" y1="30" x2="90" y2="65" stroke="rgba(168, 213, 227, 0.25)" strokeWidth="0.4" />
                  <circle cx="10" cy="20" r="1.5" fill="#A8D5E3" />
                  <circle cx="33" cy="45" r="2.5" fill="#6B35A8" />
                  <circle cx="68" cy="30" r="2" fill="#F5C842" />
                  <circle cx="90" cy="65" r="3" fill="#fff" />
                </svg>
              </div>
            )}

            {/* Central Interactive Envelope */}
            <div className={styles.envelopeWrapper}>
              <motion.div
                className={`${styles.envelope} ${loadingTemplate === 'solary' ? styles.envDark : styles.envLight}`}
                initial={{ scale: 0.9, y: 30 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: -30 }}
                transition={{ type: 'spring', damping: 15 }}
              >
                {/* Back flap */}
                <div className={styles.envelopeBack} />

                {/* Sliding Invitation Card */}
                <motion.div
                  className={`${styles.inviteCard} ${loadingTemplate === 'solary' ? styles.cardDark : styles.cardLight}`}
                  initial={{ y: 35 }}
                  animate={{ y: -65 }}
                  transition={{ delay: 0.5, duration: 0.95, ease: 'easeOut' }}
                >
                  <div className={styles.cardHeader}>
                    <span>INVITATION PREVIEW</span>
                  </div>
                  <div className={styles.cardMonogram}>
                    <span>{loadingTemplate === 'solary' ? '✦' : 'R & A'}</span>
                  </div>
                  <div className={styles.cardProgress}>
                    <motion.div
                      className={styles.cardProgressBar}
                      initial={{ width: 0 }}
                      animate={{ width: '100%' }}
                      transition={{ delay: 0.7, duration: 1.6, ease: 'easeInOut' }}
                    />
                  </div>
                  <span className={styles.cardFooter}>LOADING EXPERIENCE...</span>
                </motion.div>

                {/* Front flap and sides */}
                <div className={styles.envelopeFront} />

                {/* Wax seal */}
                <motion.div
                  className={`${styles.waxSeal} ${loadingTemplate === 'solary' ? styles.sealCosmic : styles.sealGold}`}
                  initial={{ scale: 1 }}
                  animate={{ scale: [1, 1.2, 0], rotate: [0, 15, -15] }}
                  transition={{ delay: 0.3, duration: 0.6 }}
                >
                  <span className={styles.sealSymbol}>{loadingTemplate === 'solary' ? '☾' : 'L'}</span>
                </motion.div>
              </motion.div>

              <p className={`${styles.loadingText} ${loadingTemplate === 'solary' ? styles.textDark : styles.textLight}`}>
                {loadingTemplate === 'solary' ? 'Entering galactic coordinate...' : 'Opening botanical envelope...'}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={`${styles.inner} ${revealed ? styles.revealed : ''}`}>
        <header className={styles.head}>
          <span className={styles.kicker}>THE COLLECTION</span>
          <h2 className={styles.heading}>{t.heading}</h2>
          <p className={styles.subheading}>{t.subheading}</p>
        </header>

        <div className={styles.grid}>
          {templateCatalog.map((tpl, index) => {
            const copy = t.byTemplate[tpl.id as keyof typeof t.byTemplate]
            return (
              <motion.article 
                key={tpl.id} 
                className={`${styles.card} ${index % 2 === 0 ? styles.cardEven : styles.cardOdd}`}
                initial={{ opacity: 0, y: 50 }}
                animate={revealed ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 1.0, delay: index * 0.25, ease: [0.16, 1, 0.3, 1] }}
              >
                {/* Visual Cover Layer */}
                <div className={styles.visualContainer}>
                  {/* Subtle Vibe Accent Border */}
                  <div className={styles.cardBorder} style={{ borderColor: tpl.accent }} />
                  <div className={styles.thumb}>
                    {tpl.id === 'lovebirds' ? (
                      <div className={styles.miniLovebirdsBg}>
                        {/* Botanical side borders */}
                        <div className={`${styles.miniBotanical} ${styles.miniBotanicalL}`} />
                        <div className={`${styles.miniBotanical} ${styles.miniBotanicalR}`} />
                        
                        {/* Birds branch GIF */}
                        <img src="/images/wedding-animation.gif" className={styles.miniBirds} alt="" />
                      </div>
                    ) : (
                      <div className={styles.miniSolaryBg}>
                        {/* Galactic planet stars */}
                        <div className={styles.miniStars} />
                        <div className={styles.miniNebula} />
                        <svg className={styles.miniOrbits} viewBox="0 0 100 100">
                          <circle cx="50" cy="50" r="25" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
                          <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
                          <circle cx="50" cy="25" r="2.5" fill="#6B35A8" />
                          <circle cx="50" cy="10" r="1.5" fill="#F5C842" />
                        </svg>
                      </div>
                    )}
                    {/* Simulated 3D tilt monogram & text */}
                    <div className={styles.thumbOverlay}>
                      <span className={styles.thumbTag}>TEMPLATE</span>
                      <span className={styles.thumbName}>{tpl.label}</span>
                      <span className={styles.thumbTags}>
                        {tpl.tags.map((tag) => `#${tag}`).join(' · ')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Body Content */}
                <div className={styles.body}>
                  <span className={styles.tagline} style={{ color: tpl.accent }}>
                    {copy?.tagline}
                  </span>
                  <h3 className={styles.cardTitle}>{tpl.label}</h3>
                  <p className={styles.desc}>{copy?.body}</p>
                  
                  <div className={styles.actions}>
                    <Link
                      href={`/${tpl.id}/${tpl.demoSlug}`}
                      target="_blank"
                      className={styles.preview}
                      onClick={() => handlePreviewClick(tpl.id)}
                    >
                      {t.previewCta}
                      <span className={styles.arrow}>↗</span>
                    </Link>
                    <Link
                      href={`/onboarding?template=${tpl.id}`}
                      className={styles.use}
                      style={{ background: tpl.accent }}
                    >
                      {t.useCta}
                      <span className={styles.arrow}>→</span>
                    </Link>
                  </div>
                </div>
              </motion.article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
