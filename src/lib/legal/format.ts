import type { Lang } from '@/lib/i18n/config'

/**
 * Formats a legal document's `revised_at` timestamp for public display, per
 * language — e.g. "11 Juni 2026" (id) / "11 June 2026" (en). Single source
 * of truth for the date shown under "Terakhir diperbarui" / "Last updated"
 * on /terms, /privacy, /refund. Fixed to Asia/Jakarta so the date can't
 * drift across the day boundary depending on the reader's/server's own
 * timezone.
 */
export function formatRevised(iso: string, lang: Lang): string {
  const date = new Date(iso)
  const locale = lang === 'en' ? 'en-GB' : 'id-ID'
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  }).format(date)
}
