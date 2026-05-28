import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import LoginForm from './LoginForm'
import DashboardClient from './DashboardClient'
import { fromDbRow } from './guests/types'

interface PageProps {
  params: { template: string; slug: string }
}

/**
 * Admin dashboard for a single invitation. Supabase Auth-gated.
 *
 *   - Anonymous (no Supabase Auth session)        → render <LoginForm>
 *   - Authenticated but NOT the owner of this slug → render <LoginForm> with
 *                                                    a "wrong account" error
 *   - Authenticated as owner                      → render <DashboardClient>
 *
 * Auth model:
 *   • Each invitation has `owner_user_id` referencing auth.users(id)
 *   • Session is the Supabase Auth cookie set by signInWithPassword
 *   • One user owns at most one invitation (enforced at onboarding time)
 */
export default async function DashboardPage({ params }: PageProps) {
  const { template, slug } = params

  const hasSupabase =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!hasSupabase) return <SetupPrompt />

  // 1. Look up the invitation. We use the admin client because we need
  //    the row even when no user is authenticated (so we can show the
  //    login form scoped to the right slug).
  const admin = createSupabaseAdminClient()
  const { data: invitation } = (await admin
    .from('invitations')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()) as { data: any | null }

  if (!invitation) return <NoSuchInvitation slug={slug} />

  // 2. Who is the current user?
  const serverClient = createSupabaseServerClient()
  const { data: { user } } = await serverClient.auth.getUser()

  // 3. Owner check.
  if (!user) {
    return <LoginForm slug={slug} template={template} />
  }
  if (invitation.owner_user_id !== user.id) {
    // Authenticated user is the wrong owner. Sign them out via the form
    // (showing them the error) so they can sign in with the right account.
    return (
      <main style={panelStyle}>
        <div style={cardStyle}>
          <h1 style={{ fontFamily: 'var(--font-display, serif)', fontStyle: 'italic', fontSize: 32, margin: '0 0 12px' }}>
            Akun salah
          </h1>
          <p style={{ color: '#5C4A3A', lineHeight: 1.6, margin: '0 0 16px' }}>
            Akun <strong>{user.email}</strong> bukan pemilik undangan <code>{slug}</code>.
            Logout dulu lalu login pakai akun yang benar.
          </p>
          <SignOutButton />
        </div>
      </main>
    )
  }

  // 4. Fetch RSVPs + gifts + notes + guests in parallel.
  const [{ data: rsvps }, { data: gifts }, { data: notes }, { data: guestsRaw }] =
    await Promise.all([
      admin
        .from('rsvps')
        .select('*')
        .eq('invitation_id', invitation.id)
        .order('created_at', { ascending: false }),
      admin
        .from('gift_confirmations')
        .select('*')
        .eq('invitation_id', invitation.id)
        .order('created_at', { ascending: false }),
      admin
        .from('guestbook_notes')
        .select('id, guest_name, message, color, created_at')
        .eq('invitation_id', invitation.id)
        .order('created_at', { ascending: false }),
      admin
        .from('guests')
        .select('*')
        .eq('invitation_id', invitation.id)
        .order('created_at', { ascending: true }),
    ])

  // Decrypt guests rows server-side — the client never sees ciphertext.
  // If the guests table doesn't exist yet (migration not applied), guestsRaw
  // will be null and we just render an empty list — Tab shows the empty
  // state with the "+ Import" CTA.
  const guests = (guestsRaw as any[] | null)?.map(fromDbRow) ?? []

  return (
    <DashboardClient
      slug={slug}
      template={template}
      invitation={invitation}
      rsvps={(rsvps as any) || []}
      gifts={(gifts as any) || []}
      notes={(notes as any) || []}
      guests={guests}
    />
  )
}

/* ──────────── small server-rendered placeholders ──────────── */

function SetupPrompt() {
  return (
    <main style={panelStyle}>
      <div style={cardStyle}>
        <h1 style={{ fontFamily: 'var(--font-display, serif)', fontStyle: 'italic', fontSize: 40, margin: '0 0 16px' }}>
          Setup needed
        </h1>
        <p style={{ color: '#5C4A3A', lineHeight: 1.6 }}>
          Isi <code>.env.local</code> dengan <code>NEXT_PUBLIC_SUPABASE_URL</code>,
          <code> NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, dan <code>SUPABASE_SERVICE_ROLE_KEY</code>,
          lalu restart dev server.
        </p>
      </div>
    </main>
  )
}

function NoSuchInvitation({ slug }: { slug: string }) {
  return (
    <main style={panelStyle}>
      <div style={cardStyle}>
        <h1 style={{ fontFamily: 'var(--font-display, serif)', fontStyle: 'italic', fontSize: 40, margin: '0 0 16px' }}>
          Invitation <code>{slug}</code> tidak ditemukan
        </h1>
        <p style={{ color: '#5C4A3A', lineHeight: 1.6 }}>
          Cek nama slug, atau buat row baru lewat <code>scripts/create-invitation.mjs</code>.
        </p>
      </div>
    </main>
  )
}

function SignOutButton() {
  // Client component would be cleaner but for a one-off sign-out link a
  // form posting to /api/auth/logout works fine and keeps this file SSR.
  return (
    <form action="/api/auth/logout" method="post">
      <button
        type="submit"
        style={{
          padding: '10px 20px',
          borderRadius: 999,
          background: '#2A2118',
          color: '#F5EFE3',
          border: 'none',
          fontSize: 12,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          cursor: 'pointer',
        }}
      >
        Logout & sign in dengan akun lain
      </button>
    </form>
  )
}

const panelStyle: React.CSSProperties = {
  minHeight: '100vh',
  display: 'grid',
  placeItems: 'center',
  background: 'linear-gradient(135deg, #F5EFE3 0%, #E8DCC0 100%)',
  padding: 40,
  fontFamily: 'var(--font-body, system-ui)',
}

const cardStyle: React.CSSProperties = {
  maxWidth: 520,
  padding: 40,
  background: 'rgba(255,255,255,0.9)',
  borderRadius: 20,
  boxShadow: '0 20px 60px rgba(42,33,24,0.12)',
}
