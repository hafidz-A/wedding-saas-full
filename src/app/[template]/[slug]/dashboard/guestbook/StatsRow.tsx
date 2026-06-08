'use client'

import { computeStats, type LedgerStatInput } from '@/lib/guestbook/stats'
import { statBox, statLabel, statValue } from './styles'
import tabs from '../dashboardTabs.module.css'

interface Labels {
  statTotal: string
  statArrived: string
  statAttendeesArrived: string
  statNotArrived: string
  statWalkins: string
}

export default function StatsRow({ rows, labels }: { rows: LedgerStatInput[]; labels: Labels }) {
  const s = computeStats(rows)
  return (
    <div className={tabs.statsRow}>
      <Stat label={labels.statTotal} value={String(s.totalEntries)} />
      <Stat label={labels.statArrived} value={`${s.arrivedCount} / ${s.totalEntries}`} accent="#2D8C4E" />
      <Stat label={labels.statAttendeesArrived} value={String(s.attendeesArrived)} accent="#E8553E" />
      <Stat label={labels.statNotArrived} value={String(s.notArrivedCount)} />
      <Stat label={labels.statWalkins} value={String(s.walkinCount)} />
    </div>
  )
}

function Stat({ label, value, accent = '#2A2118' }: { label: string; value: string; accent?: string }) {
  return (
    <div style={statBox}>
      <p style={statLabel}>{label}</p>
      <p style={{ ...statValue, color: accent }}>{value}</p>
    </div>
  )
}
