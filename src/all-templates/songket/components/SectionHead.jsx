'use client'

import React from 'react'
import { BintangBerantai, UkiranCorner } from './ornaments.jsx'

/** Eyebrow + title + optional subtitle, closed by the bintang-berantai divider. */
export function SectionHead({ eyebrow, title, subtitle }) {
  return (
    <header className="sk-head">
      {eyebrow && <p className="sk-eyebrow">{eyebrow}</p>}
      {title && <h2 className="sk-title">{title}</h2>}
      <BintangBerantai className="sk-divider" />
      {subtitle && <p className="sk-subtitle">{subtitle}</p>}
    </header>
  )
}

/** The four carved corners for a `.sk-card` (or any positioned box). */
export function Corners() {
  return (
    <>
      <UkiranCorner className="sk-corner sk-corner--tl" />
      <UkiranCorner className="sk-corner sk-corner--tr" />
      <UkiranCorner className="sk-corner sk-corner--bl" />
      <UkiranCorner className="sk-corner sk-corner--br" />
    </>
  )
}
