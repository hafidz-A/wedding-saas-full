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

/* Mirrors the dashboard palette (cream gradient page, white card, #2A2118 ink)
   so the guest-facing check-in feels like the same product. */
const wrap: React.CSSProperties = { minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 20, background: 'linear-gradient(135deg, var(--surface-warm) 0%, var(--surface-sunken) 100%)', color: 'var(--text-primary)', fontFamily: 'var(--font-body, system-ui)' }
const card: React.CSSProperties = { width: 'min(440px, 100%)', background: 'rgba(255,255,255,0.9)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: 28, textAlign: 'center', boxShadow: 'var(--shadow-md)' }
const h1: React.CSSProperties = { fontFamily: 'var(--font-heading)', fontStyle: 'italic', fontSize: 26, margin: '0 0 8px', color: 'var(--text-primary)' }
const p: React.CSSProperties = { color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }
