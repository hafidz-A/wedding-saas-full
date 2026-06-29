import { notFound, redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import InvitationView from './InvitationView'
import { isValidTemplate, getDefaultConfig } from '@/config/templateIndex'
import { getLang } from '@/lib/i18n/getLang'
import { getDict } from '@/lib/i18n'
import { decryptConfig } from '@/lib/crypto/config'
import { decryptField } from '@/lib/crypto/app'
import { migrateLovebirdsConfig } from '@/lib/config/migrate-lovebirds'
import { fillEmptyImages } from '@/lib/config/fillEmptyImages'
import { composeTitle } from '@/lib/meta/couple'

interface PageProps {
  params: { template: string; slug: string }
  searchParams?: { embed?: string; preview?: string }
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
export default async function Page({ params, searchParams }: PageProps) {
  const { template, slug } = params
  // Rendered inside the device-preview iframe (demo 🎨 "Tampilan"): the Shell
  // drops the device frame + 🎨 and just listens for theme messages.
  const embed = searchParams?.embed === '1'

  if (!isValidTemplate(template)) {
    notFound()
  }

  const hasSupabase =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    !!process.env.SUPABASE_SERVICE_ROLE_KEY

  const isDemoSlug = slug.startsWith('demo-') || slug === 'rizky-amara'

  let config: any = null
  let invitationId: string | null = null
  let templateId = template

  if (hasSupabase) {
    // `supabase` (anon + cookies) is used ONLY for auth.getUser() below.
    // Row reads go through the admin client so the public page no longer
    // depends on a broad anon SELECT policy on `invitations` (see the
    // 2026-06-03 security-hardening migration, which restricts anon columns).
    const supabase = createSupabaseServerClient()
    const admin = createSupabaseAdminClient()
    const { data, error } = (await admin
      .from('invitations')
      .select('id, config, is_published, is_paid, template_id, expires_at, owner_user_id')
      .eq('slug', slug)
      .maybeSingle()) as {
      data: {
        id: string
        config: any
        is_published: boolean
        is_paid: boolean
        template_id: string | null
        expires_at: string | null
        owner_user_id: string | null
      } | null
      error: any
    }

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

    // Guests can only see an invitation that is both published AND paid.
    // The owner can always preview their own (unpublished or unpaid).
    const guestCanView = !!data?.is_published && !!data?.is_paid
    if (!data || (!guestCanView && !isOwner)) {
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

      // Empty config handling. For DEMO slugs we fall back to the template
      // demo so previews work without real data. For a REAL invitation an
      // empty config means it isn't set up yet — show a "not ready" notice
      // rather than leaking the demo couple's content onto a live page.
      const isEmpty =
        !data.config || (typeof data.config === 'object' && Object.keys(data.config).length === 0)
      if (isEmpty && !isDemoSlug) {
        return <NotReadyInvitationView slug={slug} />
      }
      config = isEmpty ? getDefaultConfig(templateId) : data.config
      invitationId = (data as any).id
    }

    // Inject guestbook notes (newest first) into the guestbook section so
    // they're server-rendered — no client loading flash.
    if (invitationId) {
      const { data: notes } = await admin
        .from('guestbook_notes')
        .select('id, guest_name_enc, message_enc, color, created_at')
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

  // Decrypt sensitive config leaves (account numbers/names, whatsapp, email,
  // phone) server-side before they reach the client renderer. No-op on a
  // plaintext config (demo/default, or rows not yet encrypted).
  config = decryptConfig(config)

  // Lovebirds: fold registry→weddingGift + strip guestbook/countdown so old/
  // unsaved configs don't render dropped sections. No-op for other templates.
  if (templateId === 'lovebirds') config = migrateLovebirdsConfig(config)

  // Render-time only: blank image slots fall back to contextual demo photos.
  // Never persisted — the editor still sees the owner's real (empty) value.
  config = fillEmptyImages(config)

  // DEMO ONLY: lovebirds previews show BOTH gallery styles back-to-back so
  // visitors can compare them, each with a note explaining that a real
  // invitation picks one. Real configs are untouched — the editor policy
  // still allows exactly one gallery.
  if (isDemoSlug && templateId === 'lovebirds') config = addDemoSecondGallery(config)

  // No DB-backed row (demo slug / local fallback): drop the slug so the
  // RSVP / gift / guestbook sections use their simulated-success mode
  // instead of POSTing a slug the API will 404 ("Invitation not found").
  const submitSlug = invitationId ? slug : null

  return <InvitationView config={config} slug={submitSlug} templateId={templateId} isDemo={isDemoSlug} embed={embed} />
}

/**
 * Find any guestbook section(s) and replace their `initialNotes` prop with
 * fresh DB rows. Returns a NEW config object — does not mutate the input.
 */
function injectGuestbookNotes(config: any, dbNotes: any[]) {
  if (!config?.sections) return config
  const mapped = dbNotes.map((n) => ({
    id: n.id,
    name: decryptField(n.guest_name_enc),
    message: decryptField(n.message_enc),
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

/**
 * Demo previews only: duplicate the lovebirds gallery as its sibling style
 * (Masonry ↔ Spring Coil) right after the original, with a friendly note on
 * each, so visitors comparing templates see both layouts in one scroll.
 * Returns a NEW config; never runs for real invitations.
 */
function addDemoSecondGallery(config: any) {
  if (!config?.sections) return config
  const idx = config.sections.findIndex(
    (s: any) => s.type === 'galleryMasonry' || s.type === 'gallerySpringCoil',
  )
  if (idx === -1) return config
  const original = config.sections[idx]
  if (config.sections.some((s: any) => s.id === 'demo-gallery-alt')) return config

  const isMasonry = original.type === 'galleryMasonry'
  // masonry uses {src, alt}; spring-coil uses {src, caption} — carry the text over.
  const photos = (original.props?.photos || []).map((p: any) => {
    const text = p.alt ?? p.caption ?? ''
    return { src: p.src ?? '', alt: text, caption: text }
  })
  // Spring Coil renders each photo in a ~150px card, so it loads a small
  // demo thumbnail (`<key>-sm.jpg`, generated by
  // scripts/gen-lovebirds-gallery-thumbs.mjs) instead of the full original.
  // `full` keeps the original for the click-to-zoom lightbox.
  const toThumb = (src: string) =>
    typeof src === 'string' && src.endsWith('.jpg') && !src.endsWith('-sm.jpg')
      ? src.replace(/\.jpg$/, '-sm.jpg')
      : src
  const coilPhotos = photos.map((p: any) => ({
    src: toThumb(p.src),
    full: p.src,
    alt: p.alt,
    caption: p.caption,
  }))
  const note = (style: string, other: string) =>
    `Ini galeri gaya ${style}. Di demo ini kami pajang dua-duanya biar kamu gampang membandingkan — saat membuat undangan nanti, kamu tinggal pilih salah satu: ${style} atau ${other}.`
  const altSection = isMasonry
    ? {
        id: 'demo-gallery-alt',
        type: 'gallerySpringCoil',
        enabled: true,
        navLabel: 'Gallery 2',
        props: {
          sectionTitle: original.props?.sectionTitle || 'Moments',
          sectionSubtitle: 'Gaya kedua: Spring Coil',
          photos: coilPhotos,
          demoNote: note('Spring Coil', 'Masonry'),
        },
      }
    : {
        id: 'demo-gallery-alt',
        type: 'galleryMasonry',
        enabled: true,
        navLabel: 'Gallery 2',
        props: {
          eyebrow: 'Our Moments',
          sectionTitle: original.props?.sectionTitle || 'Memories',
          sectionSubtitle: 'Gaya kedua: Masonry',
          photos,
          demoNote: note('Masonry', 'Spring Coil'),
        },
      }
  const sections = config.sections.slice()
  sections[idx] = {
    ...original,
    props: {
      ...(original.props || {}),
      demoNote: note(isMasonry ? 'Masonry' : 'Spring Coil', isMasonry ? 'Spring Coil' : 'Masonry'),
    },
  }
  sections.splice(idx + 1, 0, altSection)
  return { ...config, sections }
}

function NotReadyInvitationView({ slug }: { slug: string }) {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
        background: 'linear-gradient(135deg, var(--surface-warm) 0%, var(--surface-sunken) 100%)',
        fontFamily: 'var(--font-body, system-ui)',
      }}
    >
      <div
        style={{
          maxWidth: 480,
          padding: 40,
          background: 'rgba(255,255,255,0.95)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-md)',
          textAlign: 'center',
        }}
      >
        <p style={{ textTransform: 'uppercase', letterSpacing: '0.32em', fontSize: 11, color: 'var(--interactive-primary)', margin: '0 0 10px' }}>
          Undangan
        </p>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontStyle: 'italic', fontSize: 32, margin: 0, color: 'var(--text-primary)', lineHeight: 1.2 }}>
          Undangan belum siap
        </h1>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.65, margin: '14px 0 0', fontSize: 14 }}>
          Undangan{' '}
          <code style={{ padding: '2px 8px', borderRadius: 'var(--radius-sm)', background: 'var(--border-subtle)', fontFamily: 'monospace', fontSize: 12 }}>{slug}</code>{' '}
          masih disiapkan oleh pemiliknya. Silakan cek kembali nanti.
        </p>
      </div>
    </main>
  )
}

function ExpiredInvitationView({ slug }: { slug: string }) {
  const t = getDict(getLang()).common.invitationExpired
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
        background: 'linear-gradient(135deg, var(--surface-warm) 0%, var(--surface-sunken) 100%)',
        fontFamily: 'var(--font-body, system-ui)',
      }}
    >
      <div
        style={{
          maxWidth: 480,
          padding: 40,
          background: 'rgba(255,255,255,0.95)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-md)',
          textAlign: 'center',
        }}
      >
        <p
          style={{
            textTransform: 'uppercase',
            letterSpacing: '0.32em',
            fontSize: 11,
            color: 'var(--interactive-primary)',
            margin: '0 0 10px',
          }}
        >
          {t.kicker}
        </p>
        <h1
          style={{
            fontFamily: 'var(--font-heading)',
            fontStyle: 'italic',
            fontSize: 32,
            margin: 0,
            color: 'var(--text-primary)',
            lineHeight: 1.2,
          }}
        >
          {t.title}
        </h1>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.65, margin: '14px 0 0', fontSize: 14 }}>
          {t.bodyPrefix} <code style={{ padding: '2px 8px', borderRadius: 'var(--radius-sm)', background: 'var(--border-subtle)', fontFamily: 'monospace', fontSize: 12 }}>{slug}</code> {t.bodySuffix}
        </p>
      </div>
    </main>
  )
}

/** "budi-sinta" → "Budi Sinta" (last-resort title when nothing else is set). */
function prettifySlug(slug: string): string {
  return slug.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim() || slug
}

/** Pull the couple's name from the config (openingGate/hero) as a meta fallback. */
function deriveCoupleName(config: any): string | null {
  const sections = config?.sections
  if (!Array.isArray(sections)) return null
  for (const s of sections) {
    const p = s?.props || {}
    const name =
      p.coupleName ||
      p.names ||
      (p.brideName && p.groomName ? `${p.brideName} & ${p.groomName}` : null)
    if (typeof name === 'string' && name.trim()) return name.replace(/\s+/g, ' ').trim()
  }
  return null
}

/**
 * First usable share image: the couple's explicit `meta.ogImage` (set in the
 * dashboard "Judul & Deskripsi" tab), else the first http(s) photo found in the
 * config (gate photo / portrait / gallery). Returns an absolute URL or null.
 */
function deriveOgImage(config: any): string | null {
  const meta = config?.meta || {}
  if (typeof meta.ogImage === 'string' && /^https?:\/\//i.test(meta.ogImage.trim())) {
    return meta.ogImage.trim()
  }
  const sections = config?.sections
  if (!Array.isArray(sections)) return null
  const http = (v: any): string | null =>
    typeof v === 'string' && /^https?:\/\//i.test(v) ? v : null
  for (const s of sections) {
    const p = s?.props || {}
    const candidates = [
      Array.isArray(p.gatePhotos) ? p.gatePhotos[0] : null,
      p.portrait, p.portrait2, p.coverImage, p.image, p.backgroundImage,
      Array.isArray(p.photos) ? (p.photos[0]?.src ?? p.photos[0]) : null,
    ]
    for (const c of candidates) {
      const u = http(c)
      if (u) return u
    }
  }
  return null
}

/**
 * Dynamic page metadata — drives the browser tab title and the WhatsApp /
 * social link preview (og:title + og:description + og:image). Reads the couple's own
 * `config.meta` (editable from the dashboard "Judul & Deskripsi" tab), falling
 * back to their name, then a prettified slug. Never throws — a DB hiccup just
 * yields the slug-based title.
 */
export async function generateMetadata({ params }: PageProps) {
  const { template, slug } = params
  const fallbackTitle = prettifySlug(slug)

  try {
    if (!isValidTemplate(template)) {
      return { title: fallbackTitle }
    }

    const hasSupabase =
      !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      !!process.env.SUPABASE_SERVICE_ROLE_KEY

    const isDemoSlug = slug.startsWith('demo-') || slug === 'rizky-amara'

    let config: any = null
    if (hasSupabase) {
      const admin = createSupabaseAdminClient()
      const { data } = (await admin
        .from('invitations')
        .select('config, is_published, is_paid, expires_at')
        .eq('slug', slug)
        .maybeSingle()) as {
        data: { config: any; is_published: boolean; is_paid: boolean; expires_at: string | null } | null
      }

      // Privacy gate: only a LIVE invitation (published + paid + not expired)
      // exposes the couple's real title/description/photo in <head> and link
      // previews. A draft/unpaid/expired row (whose page 404s) must NOT leak
      // the couple's name or OG image to anyone who guesses the slug. Demo
      // slugs are intentionally public previews.
      const isExpired =
        !!data?.expires_at && Date.parse(data.expires_at) < Date.now()
      const isLive = !!data?.is_published && !!data?.is_paid && !isExpired
      if (!isDemoSlug && (!data || !isLive)) {
        return { title: fallbackTitle }
      }

      const isEmpty =
        !data?.config || (typeof data.config === 'object' && Object.keys(data.config).length === 0)
      config = isEmpty ? getDefaultConfig(template) : data!.config
    } else {
      config = getDefaultConfig(template)
    }

    const meta = (config && config.meta) || {}
    const title =
      composeTitle(config?.couple, meta?.titleSuffix).trim() ||
      (typeof meta.title === 'string' && meta.title.trim()) ||
      deriveCoupleName(config) ||
      fallbackTitle
    const description =
      (typeof meta.description === 'string' && meta.description.trim()) ||
      'Undangan pernikahan digital.'
    const ogImage = deriveOgImage(config)
    const images = ogImage ? [ogImage] : undefined
    const twitterCard: 'summary' | 'summary_large_image' = images ? 'summary_large_image' : 'summary'

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: 'website' as const,
        ...(images ? { images } : {}),
      },
      twitter: {
        card: twitterCard,
        title,
        description,
        ...(images ? { images } : {}),
      },
    }
  } catch {
    return { title: fallbackTitle }
  }
}
