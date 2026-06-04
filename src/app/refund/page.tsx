import LegalLayout from '@/components/legal/LegalLayout'
import RefundContent from '@/components/legal/RefundContent'

export const metadata = {
  title: 'Kebijakan Pengembalian Dana',
  description: 'Kebijakan pengembalian dana (refund) & masa aktif.',
}

export default function RefundPage() {
  return (
    <LegalLayout
      title="Kebijakan Pengembalian Dana"
      updated="[TANGGAL]"
      draftNote="DRAF — sesuaikan dengan model bisnis Anda & minta peninjauan hukum sebelum dipublikasikan."
    >
      <RefundContent />
    </LegalLayout>
  )
}
