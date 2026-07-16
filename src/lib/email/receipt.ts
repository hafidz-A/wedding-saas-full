import 'server-only'
import { sendAdminEmail } from './send'
import { resolvePlan } from '@/lib/payments/plans'
import { formatIDR } from '@/lib/payments/quota'
import { siteBaseUrl } from '@/lib/site-url'

export type ReceiptKind = 'initial' | 'renewal' | 'upgrade' | 'addon'

const CHANNEL_LABELS: Record<string, string> = {
  bank_transfer: 'Transfer Bank (Virtual Account)',
  qris: 'QRIS',
  gopay: 'GoPay',
  shopeepay: 'ShopeePay',
  dana: 'DANA',
  ovo: 'OVO',
  credit_card: 'Kartu Kredit/Debit',
  echannel: 'Mandiri Bill',
  cstore: 'Gerai Retail (Alfamart/Indomaret)',
  kredivo: 'Kredivo',
  akulaku: 'Akulaku',
}

function channelLabel(channel: string | null | undefined): string {
  if (!channel) return '—'
  return CHANNEL_LABELS[channel] ?? '—'
}

function capitalize(s: string): string {
  if (!s) return s
  return s.charAt(0).toUpperCase() + s.slice(1)
}

const SUBJECTS: Record<ReceiptKind, (slug: string) => string> = {
  initial: (slug) => `✓ Pembayaran diterima — undangan ${slug}`,
  renewal: (slug) => `✓ Perpanjangan berhasil — undangan ${slug}`,
  upgrade: (slug) => `✓ Upgrade Premium berhasil — undangan ${slug}`,
  addon: (slug) => `✓ Tambahan kuota tamu berhasil — undangan ${slug}`,
}

function renderHtml(opts: {
  slug: string
  templateId: string
  plan: string
  amountIDR: number
  orderId: string | null
  channel: string | null
  extraLine?: string
}): string {
  const { slug, templateId, plan, amountIDR, orderId, channel, extraLine } = opts
  const base = siteBaseUrl()
  const viewUrl = `${base}/${templateId}/${slug}`
  const dashboardUrl = `${base}/${templateId}/${slug}/dashboard`
  const tanggal = `${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'long', timeStyle: 'short' })} WIB`

  return `
  <div style="font-family:Arial,Helvetica,sans-serif;background:#f4f1ea;padding:24px;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e0d5;">
      <div style="background:#1a1a1a;padding:20px 24px;">
        <span style="color:#ffffff;font-size:20px;font-weight:bold;letter-spacing:0.5px;">FinCards</span>
      </div>
      <div style="padding:24px;">
        <span style="display:inline-block;background:#16a34a;color:#ffffff;font-size:12px;font-weight:bold;letter-spacing:0.5px;padding:6px 14px;border-radius:999px;">LUNAS</span>
        <p style="font-size:15px;color:#1a1a1a;line-height:1.6;margin:16px 0;">
          Halo! Pembayaran untuk undangan kamu sudah kami terima. Terima kasih sudah pakai FinCards ✨
        </p>
        ${extraLine ? `<p style="font-size:14px;color:#1a1a1a;line-height:1.6;margin:0 0 16px;">${extraLine}</p>` : ''}
        <table style="width:100%;border-collapse:collapse;font-size:14px;color:#1a1a1a;">
          <tr>
            <td style="padding:6px 0;color:#6b6558;">Order ID</td>
            <td style="padding:6px 0;text-align:right;font-weight:bold;">${orderId ?? '—'}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#6b6558;">Paket</td>
            <td style="padding:6px 0;text-align:right;font-weight:bold;">${capitalize(plan)}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#6b6558;">Nominal</td>
            <td style="padding:6px 0;text-align:right;font-weight:bold;">${formatIDR(amountIDR)}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#6b6558;">Metode pembayaran</td>
            <td style="padding:6px 0;text-align:right;font-weight:bold;">${channelLabel(channel)}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#6b6558;">Tanggal</td>
            <td style="padding:6px 0;text-align:right;font-weight:bold;">${tanggal}</td>
          </tr>
        </table>
        <div style="margin-top:24px;">
          <a href="${viewUrl}" style="display:inline-block;margin-right:12px;color:#1a1a1a;font-size:14px;font-weight:bold;text-decoration:underline;">Lihat undangan</a>
          <a href="${dashboardUrl}" style="display:inline-block;color:#1a1a1a;font-size:14px;font-weight:bold;text-decoration:underline;">Buka dashboard</a>
        </div>
      </div>
      <div style="background:#f4f1ea;padding:16px 24px;border-top:1px solid #e5e0d5;">
        <p style="font-size:12px;color:#8a8375;line-height:1.6;margin:0;">
          Email otomatis dari FinCards, mohon tidak dibalas ke alamat ini.<br/>
          Ada pertanyaan? Hubungi kami di fincardsland@gmail.com atau WA 0851-1055-3938.
        </p>
      </div>
    </div>
  </div>`
}

/**
 * Best-effort branded receipt email for a verified payment. Entire function is
 * wrapped so a receipt failure (DB read, template render, or send error) can
 * NEVER throw and break the payment flow that triggered it.
 */
export async function sendPaymentReceipt(
  db: any,
  invitationId: string,
  kind: ReceiptKind,
): Promise<void> {
  try {
    const { data: inv } = await db
      .from('invitations')
      .select('slug, email, plan, template_id, paid_channel, gateway_order_id, paid_amount_idr')
      .eq('id', invitationId)
      .maybeSingle()

    if (!inv || !inv.email) return

    let amountIDR: number | null = null
    let extraLine: string | undefined

    if (kind === 'initial') {
      amountIDR = inv.paid_amount_idr ?? null
    } else if (kind === 'renewal') {
      const resolved = await resolvePlan(inv.template_id, inv.plan)
      amountIDR = resolved?.amountIDR ?? null
    } else if (kind === 'upgrade') {
      const { data: upgrade } = await db
        .from('plan_upgrades')
        .select('amount_idr')
        .eq('invitation_id', invitationId)
        .eq('status', 'paid')
        .order('paid_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      amountIDR = upgrade?.amount_idr ?? null
    } else if (kind === 'addon') {
      const { data: addon } = await db
        .from('quota_addons')
        .select('amount_idr, qty_guests')
        .eq('invitation_id', invitationId)
        .eq('status', 'paid')
        .order('paid_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      amountIDR = addon?.amount_idr ?? null
      if (addon?.qty_guests != null) extraLine = `Tambahan kuota: <strong>${addon.qty_guests} tamu</strong>`
    }

    // Never send an "Rp 0" receipt — if the amount can't be resolved (unknown
    // plan, no paid upgrade/addon row), skip with a log instead of misleading
    // the customer.
    if (amountIDR == null || amountIDR <= 0) {
      console.error('[receipt] amount unresolved — skipped', { invitationId, kind })
      return
    }

    const html = renderHtml({
      slug: inv.slug,
      templateId: inv.template_id,
      plan: inv.plan,
      amountIDR,
      orderId: inv.gateway_order_id ?? null,
      channel: inv.paid_channel ?? null,
      extraLine,
    })

    await sendAdminEmail({
      to: inv.email,
      subject: SUBJECTS[kind](inv.slug),
      html,
    })
  } catch (e) {
    console.error('[receipt] failed (ignored):', e)
  }
}
