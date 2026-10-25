/* Taman Bunga's one template-only face. The script accent (Great Vibes) and the
   label face (Montserrat) come from the root layout; only the body serif is
   loaded here, so it ships with this template's chunk and no other page pays
   for it. preload:false keeps it off every other route's <head>. */
import { Cormorant_Garamond } from 'next/font/google'

export const tbSerif = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500'],
  style: ['normal', 'italic'],
  variable: '--tb-font-serif',
  display: 'swap',
  preload: false,
})
