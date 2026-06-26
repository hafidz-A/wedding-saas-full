import type { Metadata, Viewport } from 'next'
import { BRAND } from '@/lib/brand'
import { Montserrat, Biryani, Tangerine, Great_Vibes } from 'next/font/google'
import '../styles/global.css'

// Consolidated type system (design cleanup 2026-06) — four families:
//   Montserrat   → all headings (Solary, Lovebirds, marketing/dashboard/auth)
//   Biryani      → body + label/mono (every scope)
//   Tangerine    → script accent inside the templates (Solary + Lovebirds)
//   Great Vibes  → ONLY the couple names in the Lovebirds Hero
// Semantic roles (--font-heading, --font-body, --solary-font-*, --lovebirds-font-*)
// are defined in src/styles/tokens.css and point at these CSS variables.
// Plus Jakarta Sans and Cormorant Garamond were retired in this cleanup.
const montserrat = Montserrat({
  subsets: ['latin'],
  // Montserrat is a variable font — next/font streams the full weight axis.
  variable: '--font-montserrat',
  display: 'swap',
})

const biryani = Biryani({
  subsets: ['latin'],
  weight: ['300', '400', '600', '700'],
  variable: '--font-biryani',
  display: 'swap',
})

const tangerine = Tangerine({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-tangerine',
  display: 'swap',
})

const greatVibes = Great_Vibes({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-greatvibes',
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
  // Literal hex (NOT a token): this becomes the <meta name="theme-color"> tag,
  // which the browser cannot resolve CSS variables for.
  themeColor: '#FDF6EC',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${montserrat.variable} ${biryani.variable} ${tangerine.variable} ${greatVibes.variable}`}>
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
