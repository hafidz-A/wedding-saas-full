'use client'

import { useRef, useEffect } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import styles from './BrideGroom.module.css'

gsap.registerPlugin(ScrollTrigger)

/**
 * CinematicCard — GSAP ScrollTrigger scroll-driven 3D card entrance.
 *
 * The card spins 1080° (3 full rotations) on Y-axis while entering
 * from off-screen, fully controlled by user scroll. After the scroll
 * animation completes, idle floating CSS animation activates.
 */
export default function CinematicCard({
  children,
  direction = 'right',
  triggerRef,
  startPct = 0,
  endPct = 400,
  tiltStrength = 1,
  distance = 350,
}) {
  const cardRef = useRef(null)
  const isRight = direction === 'right'

  useEffect(() => {
    const el = cardRef.current
    const trigger = triggerRef?.current
    if (!el || !trigger) return

    const totalSpinY = (isRight ? 1080 : -1080) * Math.max(tiltStrength, 0.45)
    const xStart = (isRight ? 1 : -1) * distance
    const restTiltY = (isRight ? -3 : 3) * tiltStrength

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger,
        start: 'top 60%',
        end: 'bottom 10%',
        scrub: 2.5,
        invalidateOnRefresh: true,
      },
    })

    const s = startPct / 100
    const e = endPct / 100
    const dur = e - s

    // Phase 1: Main entrance — spin + fly in
    tl.fromTo(el,
      {
        x: xStart,
        rotateY: totalSpinY,
        rotateX: isRight ? 18 * tiltStrength : -15 * tiltStrength,
        rotateZ: isRight ? 14 * tiltStrength : -12 * tiltStrength,
        scale: 0.45,
        opacity: 0,
        z: -250,
        filter: 'blur(10px)',
      },
      {
        x: (isRight ? -1 : 1) * distance * 0.04,
        rotateY: restTiltY * 4,
        rotateX: (isRight ? -3 : 2) * tiltStrength,
        rotateZ: (isRight ? -2 : 1.5) * tiltStrength,
        scale: 1.04,
        opacity: 1,
        z: 15,
        filter: 'blur(0px)',
        duration: dur * 0.78,
        ease: 'power2.out',
      },
      s,
    )

    // Phase 2: Settling — overshoot → final rest
    tl.to(el,
      {
        x: 0,
        rotateY: restTiltY,
        rotateX: 0,
        rotateZ: 0,
        scale: 1,
        z: 0,
        duration: dur * 0.22,
        ease: 'power3.out',
      },
      s + dur * 0.78,
    )

    // When scroll completes, add the idle float class
    ScrollTrigger.create({
      trigger,
      start: 'bottom 30%',
      onEnter: () => el.classList.add(styles.idleFloat),
      onLeaveBack: () => el.classList.remove(styles.idleFloat),
    })

    return () => {
      tl.scrollTrigger?.kill()
      tl.kill()
      ScrollTrigger.getAll().forEach((st) => {
        if (st.trigger === trigger) st.kill()
      })
    }
  }, [direction, triggerRef, startPct, endPct, tiltStrength, distance, isRight])

  return (
    <div
      ref={cardRef}
      className={styles.cinematicCard}
      style={{
        transformStyle: 'preserve-3d',
        willChange: 'transform, opacity, filter',
        backfaceVisibility: 'hidden',
      }}
    >
      {children}
    </div>
  )
}
