import { getLang } from '@/lib/i18n/getLang'
import LegalLayout from '@/components/legal/LegalLayout'
import { getLegalDoc } from '@/lib/legal/get'
import { formatRevised } from '@/lib/legal/format'

export const metadata = {
  title: 'Syarat & Ketentuan — Terms & Conditions',
  description: 'Syarat & Ketentuan layanan undangan digital — Terms & Conditions of the digital invitation service.',
}

export default async function TermsPage() {
  const lang = getLang()
  const en = lang === 'en'
  const { html, revisedAt } = await getLegalDoc('terms', lang)
  return (
    <LegalLayout
      title={en ? 'Terms & Conditions' : 'Syarat & Ketentuan'}
      updated={formatRevised(revisedAt, lang)}
    >
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </LegalLayout>
  )
}
