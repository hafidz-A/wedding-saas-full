// Refund decision emails (approve/reject) — branded shell mirroring receipt.ts.
import 'server-only'
import { siteBaseUrl } from '@/lib/site-url'

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
}

function shell(content: string): string {
  const base = siteBaseUrl()
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;background:#f4f1ea;padding:24px;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e0d5;">
      <div style="background:#FDF6EC;padding:22px 24px;text-align:center;">
        <img src="${base}/images/brand/fincards-logo-email.png" alt="FinCards" width="220" style="display:inline-block;width:220px;max-width:70%;height:auto;" />
      </div>
      <div style="padding:24px;color:#1a1a1a;font-size:14px;line-height:1.7;">${content}</div>
      <div style="background:#f4f1ea;padding:14px 24px;font-size:12px;color:#6b6b6b;">
        Ada pertanyaan? Balas email ini — tim FinCards siap membantu.
      </div>
    </div>
  </div>`
}

export function refundApprovedEmail(opts: { method: 'manual' | 'gateway' }): { subject: string; html: string } {
  const caraKembali = opts.method === 'gateway'
    ? 'Dana dikembalikan <strong>otomatis ke metode pembayaran</strong> yang dipakai saat membeli. Biasanya masuk dalam <strong>3–14 hari kerja</strong>, tergantung bank atau channel pembayaranmu.'
    : 'Dana <strong>ditransfer ke rekening / e-wallet</strong> yang kamu cantumkan saat mengajukan. Kalau dalam 3 hari kerja belum masuk, balas email ini ya.'
  return {
    subject: '✓ Pengembalian dana disetujui — FinCards',
    html: shell(`
      <p style="margin:0 0 12px;">Halo,</p>
      <p style="margin:0 0 12px;">Kabar baik — permintaan pengembalian dana undanganmu sudah <strong>disetujui</strong>.</p>
      <p style="margin:0 0 12px;">${caraKembali}</p>
      <p style="margin:0 0 12px;">Sesuai kebijakan pengembalian dana, undangan yang direfund <strong>dinonaktifkan permanen</strong> dan tidak bisa diterbitkan ulang. Data di dalamnya tidak lagi bisa diubah.</p>
      <p style="margin:0;">Terima kasih sudah mencoba FinCards. Kalau suatu saat butuh undangan digital lagi, pintu selalu terbuka. 🤍</p>
    `),
  }
}

export function refundRejectedEmail(opts: { note?: string | null }): { subject: string; html: string } {
  const alasan = opts.note?.trim()
    ? `<div style="margin:0 0 12px;padding:12px 14px;background:#f9f6ef;border-left:3px solid #c8b98a;border-radius:0;">
         <span style="font-size:12px;color:#6b6b6b;display:block;margin-bottom:4px;">Catatan dari tim peninjau</span>
         ${esc(opts.note.trim())}
       </div>`
    : ''
  return {
    subject: 'Update permintaan pengembalian dana — FinCards',
    html: shell(`
      <p style="margin:0 0 12px;">Halo,</p>
      <p style="margin:0 0 12px;">Terima kasih sudah menunggu. Setelah ditinjau, permintaan pengembalian dana undanganmu <strong>belum bisa disetujui</strong>.</p>
      ${alasan}
      <p style="margin:0 0 12px;">Keputusan ini mengacu pada kebijakan pengembalian dana FinCards (misalnya undangan yang sudah dipakai — ada tamu, RSVP, atau sudah tayang melewati masa tenggang — tidak bisa direfund).</p>
      <p style="margin:0;">Kalau ada yang mau didiskusikan atau menurutmu ada yang keliru, langsung balas email ini — setiap balasan dibaca tim FinCards.</p>
    `),
  }
}
