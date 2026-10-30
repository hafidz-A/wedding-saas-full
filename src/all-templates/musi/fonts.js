/* Musi's one template-only face: the serif for names and titles. The label
   face (Montserrat) comes from the root layout; this serif ships with this
   template's chunk only. preload:false keeps it off every other route's <head>. */
import { Cormorant_Garamond } from 'next/font/google'

export const muSerif = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['500', '600'],
  style: ['normal', 'italic'],
  variable: '--mu-font-serif',
  display: 'swap',
  preload: false,
})
