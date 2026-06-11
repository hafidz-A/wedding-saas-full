import { getLang } from '@/lib/i18n/getLang'
import LegalLayout from '@/components/legal/LegalLayout'
import TermsContent from '@/components/legal/TermsContent'

export const metadata = {
  title: 'Syarat & Ketentuan — Terms & Conditions',
  description: 'Syarat & Ketentuan layanan undangan digital — Terms & Conditions of the digital invitation service.',
}

export default function TermsPage() {
  const lang = getLang()
  const en = lang === 'en'
  return (
    <LegalLayout
      title={en ? 'Terms & Conditions' : 'Syarat & Ketentuan'}
      updated={en ? '11 June 2026' : '11 Juni 2026'}
    >
      <TermsContent lang={lang} />
    </LegalLayout>
  )
}
