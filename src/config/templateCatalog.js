/* ============================================================================
   TEMPLATE CATALOG — static display metadata for the /templates gallery and
   the onboarding template picker. Plain data, client-safe (no component or
   Three.js imports). Keep `id` in sync with src/config/templateIndex.js.
   ============================================================================ */
export const templateCatalog = [
  {
    id: 'lovebirds',
    label: 'Lovebirds',
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
