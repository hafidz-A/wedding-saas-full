'use client'

import { useRef, useEffect } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import styles from './BrideGroom.module.css'

gsap.registerPlugin(ScrollTrigger)

const DUMMY_CARDS = [
  { z: -50,  rotate: 8,   rotateY: 12,  scale: 0.94, blur: 1,  opacity: 0.35, offsetX: 18,  offsetY: -12 },
  { z: -110, rotate: -14, rotateY: -8,  scale: 0.88, blur: 3,  opacity: 0.22, offsetX: -24, offsetY: 20  },
  { z: -180, rotate: 5,   rotateY: 18,  scale: 0.82, blur: 5,  opacity: 0.12, offsetX: 10,  offsetY: -30 },
]

export default function DummyCardLayer({
  direction = 'right',
  triggerRef,
  variant = 'bride',
  tiltStrength = 1,
}) {
  const layerRef = useRef(null)
  const isRight = direction === 'right'

  useEffect(() => {
    const layer = layerRef.current
    const trigger = triggerRef?.current
    if (!layer || !trigger) return

    const cards = layer.querySelectorAll(`.${styles.dummyCard}`)
    if (!cards.length) return

    const tweens = [...cards].map((card, i) => {
      const cfg = DUMMY_CARDS[i] || DUMMY_CARDS[0]
      const parallaxY = (40 + i * 25) * (i % 2 === 0 ? 1 : -1)

      return gsap.fromTo(card,
        { y: parallaxY, opacity: 0, scale: cfg.scale * 0.7 },
        {
          y: -parallaxY * 0.5,
          opacity: cfg.opacity,
          scale: cfg.scale,
          scrollTrigger: {
            trigger,
            start: 'top 70%',
            end: 'bottom 30%',
            scrub: 1.8 + i * 0.3,
          },
          ease: 'none',
        }
      )
    })

    return () => {
      tweens.forEach((tw) => { tw.scrollTrigger?.kill(); tw.kill() })
    }
  }, [triggerRef, direction, tiltStrength])

  return (
    <div ref={layerRef} className={styles.dummyLayer} aria-hidden="true">
      {DUMMY_CARDS.map((cfg, i) => {
        const flipDir = isRight ? 1 : -1
        return (
          <div
            key={i}
            className={`${styles.dummyCard} ${styles[`dummy-${variant}`]}`}
            style={{
              transform: `
                translateZ(${cfg.z * tiltStrength}px)
                translateX(${cfg.offsetX * flipDir}px)
                translateY(${cfg.offsetY}px)
                rotate(${cfg.rotate * flipDir * tiltStrength}deg)
                rotateY(${cfg.rotateY * flipDir * tiltStrength}deg)
                scale(${cfg.scale})
              `,
              filter: `blur(${cfg.blur}px)`,
              opacity: 0,
            }}
          />
        )
      })}
    </div>
  )
}
