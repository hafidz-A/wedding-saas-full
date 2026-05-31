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
      initial={{ opacity: 0, scale: 0.995, filter: 'blur(4px)' }}
      animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  )
}
