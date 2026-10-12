/* Ragam motif kain — the cloth-motif sets the template can wear. They run in
   PARALLEL: `awal` is the original set (lepus spear pairs + kepala kain), and
   the six songket types sit beside it. Each key drives the CSS in
   styles/theme.css via body[data-sk-motif] (badan / body) and
   body[data-sk-kepala] (kepala / end border) — the two can come from
   different types, so 7 × 7 pairings; tiles come from
   scripts/gen-songket-motifs.mjs.

   ⚠️ The six types are interpretations from general knowledge of Palembang
   songket — check with an adat source (design doc §0 "Ragam motif kain"). */

export const MOTIFS = [
  { key: 'awal', label: 'Motif Awal', hint: 'Set pertama: tumpal bertombak + kepala kain' },
  { key: 'lepus', label: 'Lepus', hint: 'Benang emas menutupi hampir seluruh kain' },
  { key: 'tabur', label: 'Tabur', hint: 'Motif kecil ditabur berjarak' },
  { key: 'bunga', label: 'Bunga-Bunga', hint: 'Sulur bunga mawar, melati, dan daun' },
  { key: 'limar', label: 'Limar', hint: 'Ikat berwarna + Bunga Cogan emas' },
  { key: 'tretes', label: 'Tretes Mender', hint: 'Badan polos, motif hanya di pinggir & ujung' },
  { key: 'rumpak', label: 'Rumpak', hint: 'Baris motif berselang jalur polos' },
]

export const DEFAULT_MOTIF = 'awal'

export function isMotif(key) {
  return MOTIFS.some((m) => m.key === key)
}
