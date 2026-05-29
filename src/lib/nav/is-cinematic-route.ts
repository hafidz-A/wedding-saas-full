/**
 * True when the path is a public invitation page (`/<template>/<slug>`), which
 * owns its own cinematic intro and GSAP pinning. The page-transition wrapper
 * must skip these paths. `/<template>/<slug>/dashboard` is NOT cinematic.
 */
export function isCinematicRoute(pathname: string, templateIds: string[]): boolean {
  const seg = pathname.split('/').filter(Boolean)
  return seg.length === 2 && templateIds.includes(seg[0])
}
