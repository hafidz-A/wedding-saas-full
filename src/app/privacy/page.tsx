import { getLang } from '@/lib/i18n/getLang'
import LegalLayout from '@/components/legal/LegalLayout'
import PrivacyContent from '@/components/legal/PrivacyContent'

export const metadata = {
  title: 'Kebijakan Privasi — Privacy Policy',
  description: 'Kebijakan Privasi & pelindungan data pribadi (UU PDP) — Privacy Policy under Indonesian Law No. 27 of 2022.',
}

export default function PrivacyPage() {
  const lang = getLang()
  const en = lang === 'en'
  return (
    <LegalLayout
      title={en ? 'Privacy Policy' : 'Kebijakan Privasi'}
      updated={en ? '11 June 2026' : '11 Juni 2026'}
    >
      <PrivacyContent lang={lang} />
    </LegalLayout>
  )
}
