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
  config,
  slug,
  templateId,
}: {
  config: any
  slug: string
  templateId: string
}) {
  if (templateId === 'solary') {
    return <SolaryShell config={config} slug={slug} />
  }
  return <LovebirdsShell config={config} slug={slug} />
}
