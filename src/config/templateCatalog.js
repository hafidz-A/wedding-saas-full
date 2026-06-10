/* ============================================================================
   TEMPLATE CATALOG — static display metadata for the /templates gallery and
   the onboarding template picker. Plain data, client-safe (no component or
   Three.js imports). Keep `id` in sync with src/config/templateIndex.js.
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
    // PLACEHOLDER plans — edit name/price/features freely. Each template can
    // have its own plans. Payment/DB wiring is intentionally not connected yet.
    plans: [
      { id: 'basic', name: 'Basic', price: 'Rp 149.000', amountIDR: 149000, features: ['RSVP', 'Buku tamu', 'Galeri terbatas'] },
      { id: 'premium', name: 'Premium', price: 'Rp 299.000', amountIDR: 299000, features: ['Galeri unlimited', 'Tanpa watermark', 'Musik'] },
    ],
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
    // PLACEHOLDER plans — edit freely.
    plans: [
      { id: 'basic', name: 'Basic', price: 'Rp 149.000', amountIDR: 149000, features: ['RSVP', 'Buku tamu', 'Galeri terbatas'] },
      { id: 'premium', name: 'Premium', price: 'Rp 299.000', amountIDR: 299000, features: ['Galeri unlimited', 'Palette switcher', 'Musik'] },
    ],
  },
]

export function getCatalogEntry(id) {
  return templateCatalog.find((t) => t.id === id) || templateCatalog[0]
}
