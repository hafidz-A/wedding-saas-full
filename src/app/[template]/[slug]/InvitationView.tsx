'use client'

import dynamic from 'next/dynamic'

/**
 * Client dispatcher: picks the render Shell for the invitation's template.
 *
 * Each template owns its full render shell (providers, scene, navbar, CSS).
 * Shells are dynamic-imported so a route only ships the bundle for the
 * template it renders. Solary uses `ssr: false` because its shell boots a
 * Three.js scene + Lenis that need `window`.
 */
const LovebirdsShell = dynamic(() => import('@/all-templates/lovebirds/Shell.jsx'), {
  ssr: true,
})
const SolaryShell = dynamic(() => import('@/all-templates/solary/Shell.jsx'), {
  ssr: false,
})

export default function InvitationView({
  config, slug, templateId, isDemo = false, embed = false, embedSwitcher = false,
}: {
  config: any
  slug: string | null
  templateId: string
  isDemo?: boolean
  embed?: boolean
  /** Phone-frame embeds of DEMO slugs keep the 🎨 switcher inside the frame. */
  embedSwitcher?: boolean
}) {
  if (templateId === 'solary') {
    return <SolaryShell config={config} slug={slug} isDemo={isDemo} embed={embed} embedSwitcher={embedSwitcher} />
  }
  return <LovebirdsShell config={config} slug={slug} isDemo={isDemo} embed={embed} embedSwitcher={embedSwitcher} />
}
