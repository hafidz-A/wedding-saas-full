import type React from 'react'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import CheckinForm from './CheckinForm'

export const dynamic = 'force-dynamic'

export default async function CheckinPage({
  params,
  searchParams,
}: {
  params: { template: string; slug: string }
  searchParams: { k?: string }
}) {
  const slug = params.slug
  const token = (searchParams.k || '').trim()
  let valid = false
  if (token) {
    const admin = createSupabaseAdminClient()
    const { data: inv } = (await admin
      .from('invitations').select('is_published, is_paid, checkin_token').eq('slug', slug).maybeSingle()) as {
      data: { is_published: boolean; is_paid: boolean; checkin_token: string | null } | null
    }
    valid = !!inv && inv.is_published && inv.is_paid && !!inv.checkin_token && inv.checkin_token === token
  }

  return (
    <main style={wrap}>
      {valid ? (
        <CheckinForm slug={slug} token={token} />
      ) : (
        <div style={card}>
          <h1 style={h1}>Link tidak valid</h1>
          <p style={p}>Silakan minta QR check-in ke panitia.</p>
        </div>
      )}
    </main>
  )
}

const wrap: React.CSSProperties = { minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 20, background: '#0f0e13', color: '#f5f5f5', fontFamily: 'system-ui, -apple-system, sans-serif' }
const card: React.CSSProperties = { width: 'min(440px, 100%)', background: '#1b1a22', border: '1px solid #2e2c38', borderRadius: 18, padding: 28, textAlign: 'center' }
const h1: React.CSSProperties = { fontSize: 22, margin: '0 0 8px' }
const p: React.CSSProperties = { color: '#b9b6c6', margin: 0, lineHeight: 1.5 }
