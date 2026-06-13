import type { Metadata, Viewport } from 'next'
import { BRAND } from '@/lib/brand'
import { Cormorant_Garamond, Great_Vibes, Plus_Jakarta_Sans } from 'next/font/google'
import '../styles/global.css'

// Consolidated type system — exactly three families:
//   Cormorant Garamond → display + body (dapur/marketing)
//   Great Vibes        → all script accents (names, monograms, classy titles)
//   Plus Jakarta Sans  → template body (lovebirds/solary)
// Legacy variables (--font-body, --font-script, --font-display-classy) are
// aliased to these in src/styles/tokens.css so existing CSS keeps working.
const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  // 700 included for solary headings (ex-Fraunces 700–800) — real bold,
  // not synthesized faux-bold.
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-display',
  display: 'swap',
})

const greatVibes = Great_Vibes({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-greatvibes',
  display: 'swap',
})

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-jakarta',
  display: 'swap',
})

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')
const DESCRIPTION = `${BRAND} — undangan digital yang terasa seperti film pendek. Rancang dulu sampai puas, bayar saat mau diterbitkan, sebar link-nya lewat WhatsApp.`

export const metadata: Metadata = {
  // metadataBase makes relative OG/twitter image URLs resolve to absolute ones
  // (required for correct WhatsApp/social link previews of the marketing site).
  metadataBase: new URL(SITE_URL),
  // Plain string (no title.template) on purpose: invitation pages set their own
  // absolute <title> via generateMetadata and must NOT inherit the brand suffix.
  title: `${BRAND} — Undangan Digital`,
  description: DESCRIPTION,
  openGraph: {
    title: `${BRAND} — Undangan Digital`,
    description: DESCRIPTION,
    type: 'website',
    url: SITE_URL,
    siteName: BRAND,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${BRAND} — Undangan Digital`,
    description: DESCRIPTION,
  },
}

/**
 * Viewport — lock the page to a "solid" size on mobile/tablet:
 *   - initialScale + minimumScale = 1 → user can NEVER zoom out below 100%,
 *     so the page can't shrink and leave white margins around the layout.
 *   - maximumScale = 5 + userScalable = true → zoom IN is still allowed
 *     for accessibility / reading small details.
 *   - viewport-fit cover handles iOS notch safely.
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: '#FDF6EC',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${cormorant.variable} ${greatVibes.variable} ${jakarta.variable}`}>
      {/* No hardcoded background here: each template owns its own (Lovebirds
          cream via body.lovebirds-route, Solary dark via body.solary-route),
          and the dapur pages (login/onboarding/marketing/dashboard) each set
          their own full-viewport background. Keeping the shell neutral avoids
          one template's theme leaking onto another. */}
      {/* Base body reset (margin:0; min-height:100%) lives in global.css. We do
          NOT set it inline here: an inline style on <body> hydration-mismatches
          (the browser/Lenis normalises it to a different string than React's),
          which surfaced as the dev "errors" overlay. CSS handles it cleanly. */}
      <body>
        {children}
      </body>
    </html>
  )
}
