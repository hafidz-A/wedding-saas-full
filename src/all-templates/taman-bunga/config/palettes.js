/* ============================================================
   taman-bunga/config/palettes.js — the template's palette set.

   The painting itself never changes; a palette re-tints the type and
   controls that sit on it (script accent, labels, buttons, card glass)
   and the colour of the night that falls over it (`night`, read by
   engine/scene.js: `sky` = the night sky's top/middle/horizon, `tint` =
   the dusk copy of daylight-painted layers, `shade` = the top/bottom of
   the screen-wide darkening, multiplied so it darkens without haze).
   Plain data, client- and server-safe:
     • the Shell maps the chosen key to CSS variables,
     • src/lib/config/palette-allowlist.ts validates owner saves against
       TAMAN_BUNGA_PALETTE_ORDER,
     • src/components/marketing/vibeData.ts builds the Palette tab and the
       landing explorer previews from the `preview` block.
   ============================================================ */

export const TAMAN_BUNGA_PALETTES = {
  senjaMawar: {
    label: 'Senja Mawar',
    gold: '#f2c98a', // script accent, dividers, primary button
    blush: '#f6c4c4', // small uppercase labels
    ink: '#fff4e8', // body text on the painting
    glass: 'rgba(30, 15, 38, 0.86)', // card / sheet background
    onGold: '#2a122e', // text on the primary button
    night: { sky: ['#120d2e', '#2a1a4a', 'rgba(92, 44, 90, 0.85)'], tint: '#6f5d9c', shade: ['#5a4a8c', '#8a6a9c'] },
    preview: {
      background: 'linear-gradient(180deg, #8e86bf 0%, #c98fa6 42%, #e9967d 78%, #3a2440 100%)',
      surface: 'rgba(42, 18, 46, 0.55)',
      surfaceBorder: 'rgba(242, 201, 138, 0.45)',
      fgMuted: 'rgba(255, 244, 232, 0.78)',
    },
  },
  lembayung: {
    label: 'Lembayung',
    gold: '#d9c2f0',
    blush: '#e8cdf3',
    ink: '#f8f1ff',
    glass: 'rgba(28, 18, 46, 0.86)',
    onGold: '#24163a',
    night: { sky: ['#0d0b2e', '#241c5c', 'rgba(70, 52, 124, 0.85)'], tint: '#665ea8', shade: ['#4e4892', '#7a6cb0'] },
    preview: {
      background: 'linear-gradient(180deg, #6f6aa8 0%, #9b88c4 45%, #c79bb8 78%, #2c2245 100%)',
      surface: 'rgba(36, 22, 58, 0.55)',
      surfaceBorder: 'rgba(217, 194, 240, 0.45)',
      fgMuted: 'rgba(248, 241, 255, 0.78)',
    },
  },
  merahMuda: {
    label: 'Merah Muda',
    gold: '#f6b6c8',
    blush: '#ffd3de',
    ink: '#fff2f5',
    glass: 'rgba(46, 16, 32, 0.86)',
    onGold: '#3a1426',
    night: { sky: ['#1a0c26', '#3c1a46', 'rgba(124, 50, 92, 0.85)'], tint: '#86608f', shade: ['#6c4a7e', '#a26c94'] },
    preview: {
      background: 'linear-gradient(180deg, #b98fb8 0%, #e3a1b5 45%, #f2a08a 78%, #43213a 100%)',
      surface: 'rgba(58, 20, 38, 0.55)',
      surfaceBorder: 'rgba(246, 182, 200, 0.45)',
      fgMuted: 'rgba(255, 242, 245, 0.78)',
    },
  },
  gadingEmas: {
    label: 'Gading Emas',
    gold: '#f5deb0',
    blush: '#efe2c8',
    ink: '#fffaf0',
    glass: 'rgba(34, 24, 20, 0.86)',
    onGold: '#2c2016',
    night: { sky: ['#15101c', '#2e2336', 'rgba(96, 68, 62, 0.85)'], tint: '#7f6e7c', shade: ['#5e5068', '#9a8478'] },
    preview: {
      background: 'linear-gradient(180deg, #9a8fb0 0%, #c9a99a 45%, #e7b98a 78%, #3a2c26 100%)',
      surface: 'rgba(44, 32, 22, 0.55)',
      surfaceBorder: 'rgba(245, 222, 176, 0.45)',
      fgMuted: 'rgba(255, 250, 240, 0.78)',
    },
  },
}

export const TAMAN_BUNGA_PALETTE_ORDER = ['senjaMawar', 'lembayung', 'merahMuda', 'gadingEmas']

export const DEFAULT_TAMAN_BUNGA_PALETTE = 'senjaMawar'

/** Palette for a stored key; unknown/missing → the default. */
export function tamanBungaPalette(key) {
  return TAMAN_BUNGA_PALETTES[key] || TAMAN_BUNGA_PALETTES[DEFAULT_TAMAN_BUNGA_PALETTE]
}
