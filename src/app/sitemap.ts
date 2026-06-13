import type { MetadataRoute } from 'next'

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')

/**
 * Only public, non-personalised pages. Invitation pages are private per couple
 * (shared by link, not indexed), so they are deliberately excluded.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  return ['', '/privacy', '/terms', '/refund'].map((path) => ({
    url: `${SITE}${path}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: path === '' ? 1 : 0.5,
  }))
}
