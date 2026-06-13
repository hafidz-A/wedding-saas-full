import type { MetadataRoute } from 'next'

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')

/**
 * Crawl rules. The marketing + legal pages are indexable; everything that is
 * authenticated, per-customer, or operational is kept out of the index. Public
 * invitation pages (`/<template>/<slug>`) are intentionally NOT advertised here
 * — they're private to each couple and discovered via a shared link, not search.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/dashboard', '/profile', '/onboarding', '/login', '/signup', '/verify-signup', '/forgot-password', '/reset-password', '/dev/'],
    },
    sitemap: `${SITE}/sitemap.xml`,
  }
}
