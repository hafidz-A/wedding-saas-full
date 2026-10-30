/* ============================================================
   musi/config/palettes.js — the template's palette set.

   Unlike a painted template, Musi's whole scene is built in code, so a palette
   re-colours the scene too (`scene`: the Limas roof, the gold trim and carving,
   the songket cloth, paper lanterns, the Ampera lights) as well as the type
   and controls on top of it (gold titles, labels, buttons, card glass).
   Water, land, sky and the time of day stay the same in every palette.

   Plain data, client- and server-safe:
     • the Shell maps the chosen key to CSS variables and engine colours,
     • src/lib/config/palette-allowlist.ts validates owner saves against
       MUSI_PALETTE_ORDER,
     • src/components/marketing/vibeData.ts builds the Palette tab and the
       landing explorer previews from the `preview` block.
   ============================================================ */

export const MUSI_PALETTES = {
  marunEmas: {
    label: 'Marun Emas',
    gold: '#f0c96a', // titles, dividers, primary button
    blush: '#f6d9a8', // small uppercase labels
    ink: '#fff6e6', // body text
    glass: 'rgba(52, 14, 18, 0.42)', // dark layer under the card glass
    onGold: '#3a0d10', // text on the primary button
    scene: { roof: '#8f1d21', trim: '#d6a43a', songket: '#9b1f2a', lantern: '#d8322e', light: '#ffc46b' },
    preview: {
      background: 'linear-gradient(180deg, #0e1630 0%, #3a1a3a 46%, #8f1d21 78%, #2a0c10 100%)',
      surface: 'rgba(58, 16, 20, 0.55)',
      surfaceBorder: 'rgba(240, 201, 106, 0.45)',
      fgMuted: 'rgba(255, 246, 230, 0.78)',
    },
  },
  hijauSongket: {
    label: 'Hijau Songket',
    gold: '#e8cf86',
    blush: '#d8e6c2',
    ink: '#f6f8ee',
    glass: 'rgba(14, 38, 30, 0.42)',
    onGold: '#16301f',
    scene: { roof: '#2f5d46', trim: '#d9b45a', songket: '#1f6b52', lantern: '#e2a93b', light: '#ffd27a' },
    preview: {
      background: 'linear-gradient(180deg, #0e1a26 0%, #1d3a34 46%, #2f5d46 78%, #0f2018 100%)',
      surface: 'rgba(20, 48, 36, 0.55)',
      surfaceBorder: 'rgba(232, 207, 134, 0.45)',
      fgMuted: 'rgba(246, 248, 238, 0.78)',
    },
  },
  jinggaSenja: {
    label: 'Jingga Senja',
    gold: '#ffc98a',
    blush: '#ffd9c2',
    ink: '#fff5ee',
    glass: 'rgba(58, 24, 12, 0.42)',
    onGold: '#3d1a0c',
    scene: { roof: '#b5562b', trim: '#f0b45a', songket: '#c4472a', lantern: '#f07a2e', light: '#ffc27a' },
    preview: {
      background: 'linear-gradient(180deg, #1a1830 0%, #5a2a3a 44%, #c86a3a 78%, #2e140c 100%)',
      surface: 'rgba(70, 30, 16, 0.55)',
      surfaceBorder: 'rgba(255, 201, 138, 0.45)',
      fgMuted: 'rgba(255, 245, 238, 0.78)',
    },
  },
  unguMalam: {
    label: 'Ungu Malam',
    gold: '#ead2a0',
    blush: '#e6d0f2',
    ink: '#fbf6ff',
    glass: 'rgba(34, 18, 52, 0.42)',
    onGold: '#2a1640',
    scene: { roof: '#4a2a5e', trim: '#e0c07a', songket: '#5e2f7a', lantern: '#c2408a', light: '#ffd0a0' },
    preview: {
      background: 'linear-gradient(180deg, #0b0c26 0%, #2a1c4c 46%, #4a2a5e 78%, #160c22 100%)',
      surface: 'rgba(42, 22, 64, 0.55)',
      surfaceBorder: 'rgba(234, 210, 160, 0.45)',
      fgMuted: 'rgba(251, 246, 255, 0.78)',
    },
  },
}

export const MUSI_PALETTE_ORDER = ['marunEmas', 'hijauSongket', 'jinggaSenja', 'unguMalam']

export const DEFAULT_MUSI_PALETTE = 'marunEmas'

/** Palette for a stored key; unknown/missing → the default. */
export function musiPalette(key) {
  return MUSI_PALETTES[key] || MUSI_PALETTES[DEFAULT_MUSI_PALETTE]
}
