'use client'

import SectionWrapper from '../../components/SectionWrapper.jsx'
import BlockRenderer from '../../renderers/BlockRenderer.jsx'
import styles from './BlocksSection.module.css'

/**
 * Generic "anything-section" — renders content purely from the
 * `blocks: [...]` array in pageConfig. Use this for new templates
 * (perfume landing, luxury brand pages, etc.) without writing a new
 * dedicated section component.
 *
 * Layout hints (`layout` prop):
 *   'centered' — centered column, narrow
 *   'wide'     — wide column, full container
 *   'split'    — 2-col grid (blocks fill in source order)
 *   'stack'    — flow-stacking (default)
 */
export default function BlocksSection({
  id,
  title,
  subtitle,
  eyebrow,
  blocks,
  layout = 'stack',
  decorativeLayers,
  theme,
}) {
  return (
    <SectionWrapper id={id} type="blocks" theme={theme} className={styles.section}>
      {(eyebrow || title || subtitle) && (
        <header className={styles.header}>
          {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
          {title && <h2 className={styles.title}>{title}</h2>}
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </header>
      )}

      {Array.isArray(decorativeLayers) && decorativeLayers.length > 0 && (
        <div className={styles.decorLayer} aria-hidden="true">
          <BlockRenderer blocks={decorativeLayers} />
        </div>
      )}

      <div className={`${styles.content} ${styles[`layout-${layout}`]}`}>
        <BlockRenderer blocks={blocks} />
      </div>
    </SectionWrapper>
  )
}
