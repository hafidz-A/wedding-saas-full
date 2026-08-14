import { getLang } from '@/lib/i18n/getLang'
import LegalLayout from '@/components/legal/LegalLayout'
import { getLegalDoc } from '@/lib/legal/get'
import { formatRevised } from '@/lib/legal/format'

export const metadata = {
  title: 'Kebijakan Privasi — Privacy Policy',
  description: 'Kebijakan Privasi & pelindungan data pribadi (UU PDP) — Privacy Policy under Indonesian Law No. 27 of 2022.',
}

export default async function PrivacyPage() {
  const lang = getLang()
  const en = lang === 'en'
  const { html, revisedAt } = await getLegalDoc('privacy', lang)
  return (
    <LegalLayout
      title={en ? 'Privacy Policy' : 'Kebijakan Privasi'}
      updated={formatRevised(revisedAt, lang)}
    >
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </LegalLayout>
  )
}
