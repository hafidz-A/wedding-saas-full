import Link from 'next/link'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import ModerationRow, { type AdminTestimonial } from './ModerationRow'
import tbl from '@/components/ui/table.module.css'

export default async function AdminTestimonialsPage({
  searchParams,
}: {
  searchParams: { filter?: string }
}) {
  const filter = searchParams.filter === 'visible' ? 'visible' : searchParams.filter === 'pending' ? 'pending' : 'all'
  const db = createSupabaseAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (db.from('testimonials') as any)
    .select('id, rating, body, author_name, is_anonymous, template_id, is_visible, created_at, invitations(slug)')
    .order('created_at', { ascending: false })
  if (filter === 'pending') query = query.eq('is_visible', false)
  if (filter === 'visible') query = query.eq('is_visible', true)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = (await query) as { data: any[] | null }

  const rows: AdminTestimonial[] = (data ?? []).map((r) => ({
    id: r.id,
    rating: r.rating,
    body: r.body,
    authorName: r.author_name,
    isAnonymous: r.is_anonymous,
    templateId: r.template_id,
    isVisible: r.is_visible,
    slug: r.invitations?.slug ?? null,
    createdAt: r.created_at,
  }))

  const tab = (key: string, label: string) => (
    <Link
      href={`/admin/testimonials${key === 'all' ? '' : `?filter=${key}`}`}
      style={{ fontSize: 13, padding: '6px 12px', borderRadius: 'var(--radius-pill)', textDecoration: 'none', background: filter === key ? 'var(--color-charcoal)' : 'transparent', color: filter === key ? 'var(--surface-warm)' : 'var(--text-primary)', border: '0.5px solid var(--border-default)' }}
    >{label}</Link>
  )

  return (
    <div>
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>Testimoni</h1>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 16px' }}>
        Testimoni baru default tersembunyi. Klik “Munculkan” hanya untuk yang layak tampil di landing.
      </p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {tab('all', 'Semua')}
        {tab('pending', 'Menunggu')}
        {tab('visible', 'Tampil')}
      </div>
      {rows.length === 0 ? (
        <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Belum ada testimoni.</p>
      ) : (
        <div className={tbl.tableWrap}>
          <table className={tbl.table}>
            <thead>
              <tr>
                <th>Penulis</th>
                <th>Rating</th>
                <th>Ulasan</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => <ModerationRow key={t.id} t={t} />)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
