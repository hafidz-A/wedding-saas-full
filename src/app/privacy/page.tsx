import LegalLayout from '@/components/legal/LegalLayout'
import PrivacyContent from '@/components/legal/PrivacyContent'

export const metadata = {
  title: 'Kebijakan Privasi',
  description: 'Kebijakan Privasi & pelindungan data pribadi (UU PDP).',
}

export default function PrivacyPage() {
  return (
    <LegalLayout
      title="Kebijakan Privasi"
      updated="[TANGGAL]"
      draftNote="DRAF — mengacu pada UU No. 27 Tahun 2022 (UU PDP). Lengkapi placeholder [.​..] dan minta peninjauan penasihat hukum sebelum dipublikasikan."
    >
      <PrivacyContent />
    </LegalLayout>
  )
}
