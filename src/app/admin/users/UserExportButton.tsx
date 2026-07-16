// src/app/admin/users/UserExportButton.tsx
'use client'

import { useState } from 'react'
import { adminExportUserData } from './actions'
import { useAdminAlert } from '@/components/admin/AdminDialogProvider'
import { Button } from '@/components/ui/Button'

export default function UserExportButton({ userId }: { userId: string }) {
  const [busy, setBusy] = useState(false)
  const alertDialog = useAdminAlert()

  async function run() {
    setBusy(true)
    const res = await adminExportUserData(userId)
    setBusy(false)
    if (!res.ok || !res.json) { await alertDialog({ title: 'Gagal ekspor', message: res.error || 'Coba lagi.', tone: 'danger' }); return }
    const blob = new Blob([res.json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `data-user-${userId.slice(0, 8)}.json`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Button size="sm" variant="ghost" disabled={busy} onClick={run}>
      {busy ? 'Menyiapkan…' : 'Ekspor data (.json)'}
    </Button>
  )
}
