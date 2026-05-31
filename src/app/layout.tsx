import type { Metadata, Viewport } from 'next'
import { Cormorant_Garamond, DM_Sans, Pinyon_Script, Great_Vibes, Plus_Jakarta_Sans, Sacramento, Kameron } from 'next/font/google'
import '../styles/global.css'

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-display',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-body',
  display: 'swap',
})

const pinyon = Pinyon_Script({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-script',
  display: 'swap',
})

// Lovebirds heading script (Great Vibes) + body sans (Plus Jakarta Sans).
// Loaded globally so they're available; applied only on the lovebirds route
// (src/all-templates/lovebirds/styles/theme.css) via these CSS variables.
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

const sacramento = Sacramento({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-sacramento',
  display: 'swap',
})

const kameron = Kameron({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-kameron',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'finWedding — Undangan Pernikahan Digital',
  description:
    'finWedding — undangan pernikahan digital yang sinematik. Pilih template, isi cerita kalian, bagikan link.',
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
    <html lang="id" className={`${cormorant.variable} ${dmSans.variable} ${pinyon.variable} ${greatVibes.variable} ${jakarta.variable} ${sacramento.variable} ${kameron.variable}`}>
      {/* No hardcoded background here: each template owns its own (Lovebirds
          cream via body.lovebirds-route, Solary dark via body.solary-route),
          and the dapur pages (login/onboarding/marketing/dashboard) each set
          their own full-viewport background. Keeping the shell neutral avoids
          one template's theme leaking onto another. */}
      <body style={{ margin: 0, minHeight: '100%' }}>
        {children}
      </body>
    </html>
  )
}
