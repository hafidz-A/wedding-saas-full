import { notFound, redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import InvitationView from './InvitationView'
import { isValidTemplate, getDefaultConfig } from '@/config/templateIndex'

interface PageProps {
  params: { template: string; slug: string }
}

/**
 * Public invitation page (multi-template).
 *
 * URL shape: /<template>/<slug>  e.g. /lovebirds/rizky-amara
 *
 * Server component → validates the template segment, fetches the invitation
 * row by slug, and renders <InvitationView> which dispatches to the matching
 * template Shell. The actual template used for rendering is the row's
 * `template_id` (the URL segment is canonicalised to it).
 *
 * Demo slugs (`demo-*`, or the legacy `rizky-amara`) fall back to the
 * template's bundled defaultConfig so previews work without a DB row.
 */
export default async function Page({ params }: PageProps) {
  const { template, slug } = params

  if (!isValidTemplate(template)) {
    notFound()
  }

  const hasSupabase =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const isDemoSlug = slug.startsWith('demo-') || slug === 'rizky-amara'

  let config: any = null
  let invitationId: string | null = null
  let templateId = template

  if (hasSupabase) {
    const supabase = createSupabaseServerClient()
    const { data, error } = await supabase
      .from('invitations')
      .select('id, config, is_published, template_id, expires_at, owner_user_id')
      .eq('slug', slug)
      .maybeSingle()

    if (error) {
      console.error('[invitation fetch]', error)
    }

    const isExpired =
      !!(data as { expires_at?: string | null } | null)?.expires_at &&
      Date.parse((data as { expires_at: string }).expires_at) < Date.now()

    // Owner-preview bypass: a signed-in owner can view their own unpublished
    // invitation while they're still unpaid. Expired invitations stay closed
    // for everyone — the dashboard PaymentGate offers the renew CTA.
    const { data: { user: viewer } } = await supabase.auth.getUser()
    const isOwner = !!viewer && !!data?.owner_user_id && data.owner_user_id === viewer.id

    if (isExpired && !isDemoSlug) {
      return <ExpiredInvitationView slug={slug} />
    }

    if (!data || (!data.is_published && !isOwner)) {
      if (isDemoSlug) {
        config = getDefaultConfig(template)
      } else {
        notFound()
      }
    } else {
      // Canonicalise the URL to the row's real template_id.
      if (data.template_id && data.template_id !== template && isValidTemplate(data.template_id)) {
        redirect(`/${data.template_id}/${slug}`)
      }
      templateId =
        data.template_id && isValidTemplate(data.template_id) ? data.template_id : template

      // If the couple hasn't filled their config yet (empty {}), fall back
      // to the template demo so they see SOMETHING rather than a blank page.
      const isEmpty =
        !data.config || (typeof data.config === 'object' && Object.keys(data.config).length === 0)
      config = isEmpty ? getDefaultConfig(templateId) : data.config
      invitationId = (data as any).id
    }

    // Inject guestbook notes (newest first) into the guestbook section so
    // they're server-rendered — no client loading flash.
    if (invitationId) {
      const { data: notes } = await supabase
        .from('guestbook_notes')
        .select('id, guest_name, message, color, created_at')
        .eq('invitation_id', invitationId)
        .eq('is_approved', true)
        .order('created_at', { ascending: false })
        .limit(200)
      config = injectGuestbookNotes(config, notes || [])
    }
  } else {
    // No Supabase configured — local dev fallback to the template demo.
    config = getDefaultConfig(template)
  }

  return <InvitationView config={config} slug={slug} templateId={templateId} isDemo={isDemoSlug} />
}

/**
 * Find any guestbook section(s) and replace their `initialNotes` prop with
 * fresh DB rows. Returns a NEW config object — does not mutate the input.
 */
function injectGuestbookNotes(config: any, dbNotes: any[]) {
  if (!config?.sections) return config
  const mapped = dbNotes.map((n) => ({
    id: n.id,
    name: n.guest_name,
    message: n.message,
    color: n.color || 'gold',
  }))
  return {
    ...config,
    sections: config.sections.map((s: any) =>
      s.type === 'guestbook'
        ? { ...s, props: { ...(s.props || {}), initialNotes: mapped } }
        : s,
    ),
  }
}

function ExpiredInvitationView({ slug }: { slug: string }) {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
        background: 'linear-gradient(135deg, #F5EFE3 0%, #E8DCC0 100%)',
        fontFamily: 'var(--font-body, system-ui)',
      }}
    >
      <div
        style={{
          maxWidth: 480,
          padding: 40,
          background: 'rgba(255,255,255,0.95)',
          borderRadius: 22,
          boxShadow: '0 20px 60px rgba(42,33,24,0.12)',
          textAlign: 'center',
        }}
      >
        <p
          style={{
            textTransform: 'uppercase',
            letterSpacing: '0.32em',
            fontSize: 11,
            color: '#E8553E',
            margin: '0 0 10px',
          }}
        >
          Expired
        </p>
        <h1
          style={{
            fontFamily: 'var(--font-display, serif)',
            fontStyle: 'italic',
            fontSize: 32,
            margin: 0,
            color: '#2A2118',
            lineHeight: 1.2,
          }}
        >
          Masa aktif undangan ini sudah berakhir
        </h1>
        <p style={{ color: '#5C4A3A', lineHeight: 1.65, margin: '14px 0 0', fontSize: 14 }}>
          Halaman undangan <code style={{ padding: '2px 8px', borderRadius: 6, background: 'rgba(42,33,24,0.08)', fontFamily: 'monospace', fontSize: 12 }}>{slug}</code> tidak bisa dibuka untuk sementara. Silakan hubungi pasangan untuk informasi lebih lanjut.
        </p>
      </div>
    </main>
  )
}

export async function generateMetadata({ params }: PageProps) {
  return {
    title: `${params.slug} — Wedding Invitation`,
    description: 'A cinematic wedding invitation',
  }
}
