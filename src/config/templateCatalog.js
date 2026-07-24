/* ============================================================================
   TEMPLATE CATALOG — static display metadata for the /templates gallery and
   the onboarding template picker. Plain data, client-safe (no component or
   Three.js imports). Keep `id` in sync with src/config/templateIndex.js.

   NOT the source of truth for anything an operator edits. Pricing, plan names
   and feature lists live in the `template_plans` table and are edited at
   /admin/templates; display metadata (label, tags, accent, taglines, blurbs)
   lives in the `templates` table, same editor. This file is only the code-level
   fallback for those (see src/lib/templates/catalog.ts) plus the two fields
   that must exist in code: `id` and `demoSlug`.

   Do NOT reintroduce a `plans` array here — a second copy of prices/features
   silently drifts from the DB and can show a customer a price checkout won't
   honour. Removed 2026-07-24 for exactly that reason.
   ============================================================================ */
export const templateCatalog = [
  {
    id: 'lovebirds',
    label: 'Lovebirds',
    category: 'wedding',
    description:
      'Undangan sinematik hangat — kartu foto polaroid, animasi botanical, dan section lengkap (RSVP, gift, galeri, guestbook).',
    demoSlug: 'demo-lovebirds',
    thumbnail: '/images/templates/lovebirds-thumb.jpg',
    accent: '#E8553E',
    tags: ['cinematic', 'elegant', 'botanical'],
  },
  {
    id: 'solary',
    label: 'Solary',
    category: 'wedding',
    description:
      'Tema tata surya futuristik — planet 3D Three.js, perjalanan antar-planet saat scroll, dan palette switcher.',
    demoSlug: 'demo-solary',
    thumbnail: '/images/templates/solary-thumb.jpg',
    accent: '#6B35A8',
    tags: ['futuristic', 'space', '3D'],
  },
]

export function getCatalogEntry(id) {
  return templateCatalog.find((t) => t.id === id) || templateCatalog[0]
}
