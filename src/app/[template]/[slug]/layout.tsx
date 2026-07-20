import type { Metadata } from 'next'

/**
 * Per-couple layout. Exists only to wire the favicon — every route under
 * `/[template]/[slug]/...` (the public invitation AND the dashboard)
 * inherits the icon link declared here.
 *
 * The icon itself is served by `app/[template]/[slug]/icon/route.ts`,
 * which now returns the official FinCards brand PNG for every invitation.
 */
export async function generateMetadata(
  { params }: { params: { template: string; slug: string } },
): Promise<Metadata> {
  return {
    icons: {
      icon: [{ url: `/${params.template}/${params.slug}/icon`, type: 'image/png' }],
    },
  }
}

export default function SlugLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
