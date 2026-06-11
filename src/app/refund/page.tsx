import { getLang } from '@/lib/i18n/getLang'
import LegalLayout from '@/components/legal/LegalLayout'
import RefundContent from '@/components/legal/RefundContent'

export const metadata = {
  title: 'Kebijakan Pengembalian Dana — Refund Policy',
  description: 'Kebijakan pengembalian dana (refund) & masa aktif — Refund Policy and active-period terms.',
}

export default function RefundPage() {
  const lang = getLang()
  const en = lang === 'en'
  return (
    <LegalLayout
      title={en ? 'Refund Policy' : 'Kebijakan Pengembalian Dana'}
      updated={en ? '11 June 2026' : '11 Juni 2026'}
    >
      <RefundContent lang={lang} />
    </LegalLayout>
  )
}
