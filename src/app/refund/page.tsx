import { getLang } from '@/lib/i18n/getLang'
import LegalLayout from '@/components/legal/LegalLayout'
import { getLegalDoc } from '@/lib/legal/get'
import { formatRevised } from '@/lib/legal/format'

export const metadata = {
  title: 'Kebijakan Pengembalian Dana — Refund Policy',
  description: 'Kebijakan pengembalian dana (refund) & masa aktif — Refund Policy and active-period terms.',
}

export default async function RefundPage() {
  const lang = getLang()
  const en = lang === 'en'
  const { html, revisedAt } = await getLegalDoc('refund', lang)
  return (
    <LegalLayout
      title={en ? 'Refund Policy' : 'Kebijakan Pengembalian Dana'}
      updated={formatRevised(revisedAt, lang)}
    >
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </LegalLayout>
  )
}
