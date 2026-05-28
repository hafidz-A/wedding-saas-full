'use client'

import { resolveTheme, resolveBackground } from '../config/themes.js'

/**
 * Reusable shell for any section. Applies:
 *   - the section's theme via inline CSS variables
 *   - an optional background override
 *   - data-attributes for debugging
 *
 * Sections that opt-in pass `theme`, `background`, `id` from their config.
 * The existing specialized sections (Hero, OurStory, …) handle their own
 * outer <section>, so they don't need this wrapper — it's mainly for new
 * block-composed sections.
 */
export default function SectionWrapper({
  id,
  type,
  theme,
  background,
  className,
  children,
  as: Tag = 'section',
  ariaLabel,
}) {
  const style = {
    ...resolveTheme(theme),
    ...(resolveBackground(background) ? { background: resolveBackground(background) } : null),
    position: 'relative',
  }

  return (
    <Tag
      data-section={id}
      data-section-type={type}
      data-section-theme={theme}
      className={className}
      style={style}
      aria-label={ariaLabel}
    >
      {children}
    </Tag>
  )
}
