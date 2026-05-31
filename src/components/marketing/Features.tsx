'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import type { Dict } from '@/lib/i18n'
import { useReveal } from '@/hooks/useReveal'
import styles from './Features.module.css'

interface FeatureTab {
  id: string
  title: string
  body: string
  preview: React.ReactNode
}

export function Features({ t }: { t: Dict['landing']['features'] }) {
  const { ref, revealed } = useReveal<HTMLDivElement>()
  const [activeTab, setActiveTab] = useState<string>('rsvp')

  const TABS: FeatureTab[] = [
    {
      id: 'rsvp',
      title: t.items[0].title, // RSVP & Guest List
      body: t.items[0].body,
      preview: (
        <div className={styles.mockupRsvp}>
          <div className={styles.rsvpHeader}>
            <span>WILL YOU ATTEND?</span>
          </div>
          <div className={styles.rsvpField}>
            <label className={styles.mockLabel}>GUEST NAME</label>
            <input type="text" readOnly value="Adinda Rahma" className={styles.mockInput} />
          </div>
          <div className={styles.rsvpButtons}>
            <button type="button" className={styles.mockBtnAttending}>ATTENDING</button>
            <button type="button" className={styles.mockBtnDeclining}>DECLINE</button>
          </div>
          <div className={styles.rsvpField}>
            <label className={styles.mockLabel}>MEAL OPTION</label>
            <div className={styles.mockSelect}>Beef Tenderloin ▾</div>
          </div>
        </div>
      )
    },
    {
      id: 'music',
      title: t.items[1].title, // Background Music
      body: t.items[1].body,
      preview: (
        <div className={styles.mockupMusic}>
          <div className={styles.vinylContainer}>
            <motion.div 
              className={styles.vinylDisk}
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
            >
              <div className={styles.vinylCenter} />
            </motion.div>
            <div className={styles.vinylArm} />
          </div>
          <div className={styles.musicTrack}>
            <span className={styles.trackTitle}>A Thousand Years</span>
            <span className={styles.trackArtist}>Christina Perri</span>
          </div>
        </div>
      )
    },
    {
      id: 'gallery',
      title: t.items[2].title, // Gallery, Story & Gifts
      body: t.items[2].body,
      preview: (
        <div className={styles.mockupGallery}>
          <div className={styles.polaroidStack}>
            <motion.div 
              className={`${styles.polaroid} ${styles.polaroid1}`}
              whileHover={{ rotate: -8, scale: 1.05 }}
            >
              <img src="https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=300&q=80" alt="" />
              <span>Sweetest Vows</span>
            </motion.div>
            <motion.div 
              className={`${styles.polaroid} ${styles.polaroid2}`}
              whileHover={{ rotate: 10, scale: 1.05 }}
            >
              <img src="https://images.unsplash.com/photo-1525186402429-b4ff38bedec6?auto=format&fit=crop&w=300&q=80" alt="" />
              <span>Infinite Love</span>
            </motion.div>
          </div>
        </div>
      )
    }
  ]

  const activeData = TABS.find((tab) => tab.id === activeTab) || TABS[0]

  return (
    <section id="features" className={styles.section} ref={ref}>
      <div className={`${styles.inner} ${revealed ? styles.revealed : ''}`}>
        <header className={styles.head}>
          <span className={styles.kicker}>ELEVATED FEATURES</span>
          <h2 className={styles.heading}>{t.heading}</h2>
          <p className={styles.subheading}>{t.subheading}</p>
        </header>

        <div className={styles.layout}>
          {/* Tabs Selector List */}
          <div className={styles.tabs}>
            {TABS.map((tab, i) => {
              const isSelected = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  className={`${styles.tabBtn} ${isSelected ? styles.tabBtnSelected : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <span className={styles.tabNum}>{String(i + 1).padStart(2, '0')}</span>
                  <div className={styles.tabCopy}>
                    <h3 className={styles.tabTitle}>{tab.title}</h3>
                    <p className={styles.tabBody}>{tab.body}</p>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Interactive Mockup Container */}
          <div className={styles.previewContainer}>
            <div className={styles.iphoneShell}>
              <div className={styles.notch} />
              <div className={styles.screen}>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    className={styles.screenInner}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.4 }}
                  >
                    {activeData.preview}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
            <div className={styles.screenShadow} />
          </div>
        </div>
      </div>
    </section>
  )
}
