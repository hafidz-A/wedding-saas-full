'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import type { Dict } from '@/lib/i18n'
import { useReveal } from '@/hooks/useReveal'
import styles from './VibeExploration.module.css'

interface VibeEntry {
  id: string
  label: Record<'id' | 'en', string>
  description: Record<'id' | 'en', string>
  watermark: string
  color: string
  bg: string
  accent: string
  image: string
}

const VIBES: VibeEntry[] = [
  {
    id: 'elegant',
    label: { id: 'Elegant Luxury', en: 'Elegant Luxury' },
    description: { id: 'Sentuhan kain sutra, anggrek putih, dan kaligrafi emas tulisan tangan.', en: 'Pure silk drapery, white orchids, and handmade gold calligraphy.' },
    watermark: 'Luxury',
    color: '#C89A1F',
    bg: '#FDF8F2',
    accent: 'rgba(200, 154, 31, 0.1)',
    image: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'garden',
    label: { id: 'Garden Romance', en: 'Garden Romance' },
    description: { id: 'Mawar yang merekah, altar kayu, dan gemerlap lampu hias outdoor.', en: 'Blooming roses, wooden arches, and soft glowing string lights.' },
    watermark: 'Romance',
    color: '#2D8C4E',
    bg: '#F2FDF5',
    accent: 'rgba(45, 140, 78, 0.1)',
    image: 'https://images.unsplash.com/photo-1546190255-451a91afc548?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'classic',
    label: { id: 'Royal Classic', en: 'Royal Classic' },
    description: { id: 'Kemegahan lampu kristal, dekorasi lilin, dan monogram klasik.', en: 'Grand crystal chandeliers, silver accents, and classic crest monograms.' },
    watermark: 'Royal',
    color: '#3D9BC1',
    bg: '#F2F7FD',
    accent: 'rgba(61, 155, 193, 0.1)',
    image: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'blackgold',
    label: { id: 'Modern Black Gold', en: 'Modern Black Gold' },
    description: { id: 'Kertas hitam bertekstur, tinta emas foil, dan layout minimalis berani.', en: 'Textured matte black cardstock, foil stamps, and bold minimalist lines.' },
    watermark: 'Modern',
    color: '#F5C842',
    bg: '#1A1A1A',
    accent: 'rgba(245, 200, 66, 0.08)',
    image: 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'fairytale',
    label: { id: 'Fairytale Dream', en: 'Fairytale Dream' },
    description: { id: 'Bunga wisteria bergantungan, warna pastel magis, dan lentera berkabut.', en: 'Hanging wisteria vines, magic lilac lighting, and glowing forest lanterns.' },
    watermark: 'Dream',
    color: '#6B35A8',
    bg: '#FAF5FD',
    accent: 'rgba(107, 53, 168, 0.1)',
    image: 'https://images.unsplash.com/photo-1523438885200-e635ba2c371e?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'vintage',
    label: { id: 'Vintage Romance', en: 'Vintage Romance' },
    description: { id: 'Kertas perkamen kuno, jepretan foto polaroid, dan nuansa hangat nostalgia.', en: 'Aged deckled parchment, vintage Polaroid photos, and warm nostalgia.' },
    watermark: 'Vintage',
    color: '#E8553E',
    bg: '#FDF4F2',
    accent: 'rgba(232, 85, 62, 0.1)',
    image: 'https://images.unsplash.com/photo-1502139214982-d0ad755818d8?auto=format&fit=crop&w=800&q=80'
  }
]

export function VibeExploration({ lang, t }: { lang: 'id' | 'en'; t: Dict['landing']['vibeExploration'] }) {
  const { ref, revealed } = useReveal<HTMLDivElement>()
  const [activeVibe, setActiveVibe] = useState<VibeEntry>(VIBES[0])
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0 })

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget
    const box = card.getBoundingClientRect()
    const x = e.clientX - box.left - box.width / 2
    const y = e.clientY - box.top - box.height / 2
    const factorX = 10 / (box.height / 2)
    const factorY = 10 / (box.width / 2)
    setTilt({
      rotateX: -y * factorX,
      rotateY: x * factorY,
    })
  }

  const handleMouseLeave = () => {
    setTilt({ rotateX: 0, rotateY: 0 })
  }

  const isDark = activeVibe.id === 'blackgold'

  return (
    <section 
      className={styles.section} 
      ref={ref}
      style={{ 
        backgroundColor: activeVibe.bg,
        transition: 'background-color 0.8s ease'
      }}
    >
      <div className={styles.inner}>
        <header className={`${styles.head} ${isDark ? styles.headDark : ''}`}>
          <span className={styles.kicker} style={{ color: activeVibe.color }}>
            {t.heading}
          </span>
          <h2 className={styles.heading}>{t.subheading}</h2>
        </header>

        <div className={styles.layout}>
          {/* Vibe Selection Panel */}
          <div className={styles.menu}>
            {VIBES.map((vibe) => {
              const isSelected = activeVibe.id === vibe.id
              return (
                <button
                  key={vibe.id}
                  type="button"
                  className={`${styles.menuBtn} ${isSelected ? styles.menuBtnSelected : ''} ${isDark ? styles.menuBtnDark : ''}`}
                  onClick={() => setActiveVibe(vibe)}
                  style={{
                    color: isSelected ? vibe.color : '',
                    backgroundColor: isSelected ? vibe.accent : 'transparent'
                  }}
                >
                  <span className={styles.bullet} style={{ backgroundColor: vibe.color }} />
                  {vibe.label[lang]}
                </button>
              )
            })}
          </div>

          {/* Vibe Detail Display */}
          <div className={styles.display}>
            {/* Calligraphic Watermark Text behind the photo card */}
            <AnimatePresence mode="wait">
              <motion.div
                key={`watermark-${activeVibe.id}`}
                className={styles.watermarkText}
                style={{ color: activeVibe.color }}
                initial={{ opacity: 0, scale: 0.85, y: -20 }}
                animate={{ opacity: isDark ? 0.04 : 0.08, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 1.15, y: 20 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              >
                {activeVibe.watermark}
              </motion.div>
            </AnimatePresence>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeVibe.id}
                className={styles.displayContent}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.45, ease: 'easeOut' }}
              >
                {/* Asymmetrical Photo Card */}
                <motion.div 
                  className={styles.photoFrame}
                  onMouseMove={handleMouseMove}
                  onMouseLeave={handleMouseLeave}
                  animate={{
                    rotateX: tilt.rotateX,
                    rotateY: tilt.rotateY,
                  }}
                  transition={{ type: 'spring', stiffness: 150, damping: 20 }}
                  style={{ transformStyle: 'preserve-3d', perspective: 1000 }}
                >
                  <div className={styles.photoGlow} style={{ background: `radial-gradient(circle, ${activeVibe.color}25 0%, transparent 60%)` }} />
                  <img 
                    src={activeVibe.image} 
                    alt={activeVibe.label[lang]} 
                    className={styles.photo}
                  />
                  <div className={styles.badge} style={{ borderColor: activeVibe.color, color: activeVibe.color, transform: 'translateZ(20px)' }}>
                    {activeVibe.label[lang].toUpperCase()}
                  </div>
                </motion.div>

                {/* Vibe Copy */}
                <div className={`${styles.details} ${isDark ? styles.detailsDark : ''}`}>
                  <p className={styles.description}>{activeVibe.description[lang]}</p>
                  <div className={styles.palette}>
                    <span className={styles.paletteLabel}>Ambience Palette</span>
                    <div className={styles.swatches}>
                      <span className={styles.swatch} style={{ backgroundColor: activeVibe.color }} />
                      <span className={styles.swatch} style={{ backgroundColor: activeVibe.bg }} />
                      <span className={styles.swatch} style={{ backgroundColor: '#2A2118' }} />
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  )
}
