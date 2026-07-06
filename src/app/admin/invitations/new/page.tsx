// src/app/admin/invitations/new/page.tsx
// Admin: create an invitation FOR a client (server wrapper → client form).
// Gated by src/app/admin/layout.tsx (requireAdmin) — no re-gate here.
import Link from 'next/link'
import CreateInvitationForm from './CreateInvitationForm'

export default function AdminCreateInvitationPage() {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
        <Link href="/admin/invitations" style={{ fontSize: 13, color: 'var(--interactive-primary)' }}>← Undangan</Link>
      </div>
      <h1 style={{ fontSize: 22, margin: '4px 0 4px' }}>Buat undangan untuk klien</h1>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 16px', maxWidth: 620 }}>
        Undangan selalu dimiliki klien. Kalau email klien belum punya akun, sistem
        membuatkan akunnya + memberi <strong>kode atur-password</strong> yang bisa kamu kirimkan.
        Kalau sudah punya akun, undangan langsung ditautkan ke akun itu.
      </p>
      <CreateInvitationForm />
    </div>
  )
}
