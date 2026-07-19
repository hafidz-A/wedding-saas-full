import { buildWhatsAppUrl } from '@/lib/guests/whatsapp'
import { safeExternalUrl } from '@/lib/safeUrl'

/**
 * manual-pay.ts — pure, client-safe message/link builder for the `manual`
 * payment-mode fallback. No DB access, no secrets: WhatsApp/Email are public
 * business contacts passed in by the caller. Reused by both the new-purchase
 * popup (marketing + onboarding) and the existing-invitation contact modal
 * (dashboard + profile).
 */

export type ManualPayKind = 'new' | 'pay-draft' | 'renew' | 'upgrade' | 'quota'

export interface ManualPayContext {
  kind: ManualPayKind
  templateLabel: string
  planName: string
  priceLabel: string
  guestTotal?: number
  bride?: string
  groom?: string
  dateLabel?: string
  venue?: string
  slug?: string
  lang?: 'id' | 'en'
}

export interface ManualContact {
  whatsapp: string
  email: string
}

/**
 * ManualPayDict — the minimal i18n slice this module needs. `manualPay` in
 * `src/lib/i18n/dictionaries/manualPay.ts` (Task 4) is a structural superset
 * of this shape (it adds UI labels like button/modal copy); anything
 * conforming to this shape can be passed in directly.
 */
export interface ManualPayDict {
  order: {
    intro: string
    plan: string
    template: string
    couple: string
    date: string
    venue: string
    url: string
    guests: string
    lang: string
  }
  existing: Record<Exclude<ManualPayKind, 'new'>, string>
  subject: Record<ManualPayKind, string>
}

/** Replace `{{slug}}`/`{{plan}}` placeholders (all occurrences) with the given values. */
function interpolate(template: string, vars: { slug?: string; plan?: string }): string {
  return template
    .replace(/\{\{slug\}\}/g, vars.slug ?? '')
    .replace(/\{\{plan\}\}/g, vars.plan ?? '')
}

/**
 * buildManualMessage — assemble the WhatsApp/email body + email subject.
 *
 * `kind:'new'` renders the full multi-line order from `dict.order` + every
 * typed field on `ctx` (optional fields that weren't filled in are simply
 * omitted, never rendered as "undefined"/blank bullets). Every other kind
 * (an existing invitation: pay-draft/renew/upgrade/quota) interpolates
 * `{{slug}}`/`{{plan}}` into the matching `dict.existing[kind]` template.
 */
export function buildManualMessage(
  ctx: ManualPayContext,
  dict: ManualPayDict,
): { plain: string; emailSubject: string } {
  const emailSubject = interpolate(dict.subject[ctx.kind], { slug: ctx.slug, plan: ctx.planName })

  if (ctx.kind === 'new') {
    const lines: string[] = [dict.order.intro]
    const priceSuffix = ctx.priceLabel ? ` (${ctx.priceLabel})` : ''
    lines.push(`• ${dict.order.plan}: ${ctx.planName}${priceSuffix}`)
    if (ctx.templateLabel) lines.push(`• ${dict.order.template}: ${ctx.templateLabel}`)
    if (ctx.bride || ctx.groom) {
      lines.push(`• ${dict.order.couple}: ${[ctx.bride, ctx.groom].filter(Boolean).join(' & ')}`)
    }
    if (ctx.dateLabel) lines.push(`• ${dict.order.date}: ${ctx.dateLabel}`)
    if (ctx.venue) lines.push(`• ${dict.order.venue}: ${ctx.venue}`)
    if (ctx.slug) lines.push(`• ${dict.order.url}: weddingsite/${ctx.slug}`)
    if (ctx.guestTotal != null) lines.push(`• ${dict.order.guests}: ${ctx.guestTotal}`)
    if (ctx.lang) lines.push(`• ${dict.order.lang}: ${ctx.lang}`)
    return { plain: lines.join('\n'), emailSubject }
  }

  const plain = interpolate(dict.existing[ctx.kind], { slug: ctx.slug, plan: ctx.planName })
  return { plain, emailSubject }
}

/**
 * buildManualLinks — turn a message into ready-to-open outbound links.
 * `waUrl` uses the hybrid `wa.me` scheme (direct chat when a phone is
 * configured, contact picker otherwise); `mailtoUrl` carries the same body
 * as the subject/body query params. Every href is hardened through
 * `safeExternalUrl`; `copyText` backs the "Salin pesan" clipboard fallback.
 */
export function buildManualLinks(
  contact: ManualContact,
  ctx: ManualPayContext,
  dict: ManualPayDict,
): { waUrl: string; mailtoUrl: string; emailAddress: string; copyText: string } {
  const { plain, emailSubject } = buildManualMessage(ctx, dict)
  const waUrl = safeExternalUrl(
    buildWhatsAppUrl({ phoneE164: contact.whatsapp || null, message: plain }),
  )
  const mailtoUrl = safeExternalUrl(
    `mailto:${contact.email}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(plain)}`,
  )
  return { waUrl, mailtoUrl, emailAddress: contact.email, copyText: plain }
}
