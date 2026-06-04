'use client'

import { usePathname } from 'next/navigation'
import { motion } from 'motion/react'
import { templateCatalog } from '@/config/templateCatalog'
import { isCinematicRoute } from '@/lib/nav/is-cinematic-route'

const TEMPLATE_IDS = templateCatalog.map((t: { id: string }) => t.id)

export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // Public invitation pages own their intro + GSAP pinning — don't wrap them.
  if (isCinematicRoute(pathname, TEMPLATE_IDS)) return <>{children}</>

  // IMPORTANT: keep this entrance to OPACITY only. A lingering `transform` or
  // `filter` (even `scale(1)` / `blur(0px)`) makes this wrapper a containing
  // block, which traps every `position: fixed` descendant — that's what stops
  // the floating SiteNav (and any future fixed UI) from sticking to the
  // viewport. Opacity creates a stacking context but NOT a containing block.
  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  )
}
