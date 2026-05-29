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

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}
