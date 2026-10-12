import { Cinzel } from 'next/font/google'

/* Loaded here, not in the root layout, so only Songket routes ship the face. */
export const cinzel = Cinzel({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-cinzel',
  display: 'swap',
})
