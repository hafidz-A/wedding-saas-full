'use client'

import { useState } from 'react'
import useScrollReveal from '../../hooks/useScrollReveal.js'
import styles from './Faq.module.css'

const DEFAULTS = { title: 'Questions', subtitle: '', items: [] }

function Chevron({ open }) {
  return (
    <svg
      className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}
      viewBox="0 0 24 24" width="20" height="20"
      fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

export default function Faq(props) {
  const { title, subtitle, items } = { ...DEFAULTS, ...props }
  const { ref, isVisible } = useScrollReveal()
  const [openId, setOpenId] = useState(items?.[0]?.id ?? null)

  const toggle = (id) => setOpenId((curr) => (curr === id ? null : id))

  return (
    <section
      ref={ref}
      className={`${styles.section} ${isVisible ? styles.visible : ''}`}
      aria-label="Frequently Asked Questions"
    >
      <div className={styles.inner}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>Good to know</p>
          <h2 className={styles.title}>{title}</h2>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </header>

        <div className={styles.list} role="list">
          {items.map((item) => {
            const open = openId === item.id
            const panelId = `faq-panel-${item.id}`
            const btnId = `faq-trigger-${item.id}`
            return (
              <div
                key={item.id}
                role="listitem"
                className={`${styles.item} ${open ? styles.itemOpen : ''}`}
              >
                <button
                  id={btnId}
                  type="button"
                  className={styles.trigger}
                  aria-expanded={open}
                  aria-controls={panelId}
                  onClick={() => toggle(item.id)}
                >
                  <span className={styles.question}>{item.q}</span>
                  <Chevron open={open} />
                </button>
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={btnId}
                  className={styles.panel}
                  hidden={!open}
                >
                  <p className={styles.answer}>{item.a}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
