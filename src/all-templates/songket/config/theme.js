/* Songket palettes + ornaments (keys only — colours live in styles/songket.css).
   Keep in sync with src/lib/config/palette-allowlist.ts and
   src/lib/templates/appearance.ts (the server-side allowlists). */

export const PALETTES = [
  { key: 'merahLak', label: 'Merah Lak', swatch: ['#5E1020', '#D4AF37'] },
  { key: 'hitamLak', label: 'Hitam Lak', swatch: ['#17100E', '#D4AF37'] },
  { key: 'gadingSongket', label: 'Gading Songket', swatch: ['#F4E9D2', '#6E5310'] },
  { key: 'hijauLimas', label: 'Hijau Limas', swatch: ['#1F3B2D', '#D4AF37'] },
]

export const ORNAMENTS = [
  { key: 'melati', label: 'Hujan melati' },
  { key: 'kilauEmas', label: 'Kilau benang emas' },
  { key: 'kunang', label: 'Kunang-kunang Musi' },
]

export const DEFAULT_PALETTE = 'merahLak'
export const DEFAULT_ORNAMENT = 'melati'

export function resolvePalette(key) {
  return PALETTES.some((p) => p.key === key) ? key : DEFAULT_PALETTE
}

/** 'none' is honoured so a couple can switch the ambient layer off. */
export function resolveOrnament(key) {
  if (key === 'none') return 'none'
  return ORNAMENTS.some((o) => o.key === key) ? key : DEFAULT_ORNAMENT
}
