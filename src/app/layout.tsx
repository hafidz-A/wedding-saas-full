import type { Metadata, Viewport } from 'next'
import { Cormorant_Garamond, DM_Sans } from 'next/font/google'
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

export const metadata: Metadata = {
  title: 'Wedding Invitation',
  description: 'Cinematic wedding invitation experience',
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
    <html lang="en" className={`${cormorant.variable} ${dmSans.variable}`}>
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
