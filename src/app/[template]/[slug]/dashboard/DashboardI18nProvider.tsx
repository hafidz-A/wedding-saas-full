'use client'
import { createContext, useContext } from 'react'
import type { Dict } from '@/lib/i18n'

type DashDict = Dict['dashboard']

const Ctx = createContext<DashDict | null>(null)

export function DashboardI18nProvider({
  dict,
  children,
}: {
  dict: DashDict
  children: React.ReactNode
}) {
  return <Ctx.Provider value={dict}>{children}</Ctx.Provider>
}

export function useDashboardDict(): DashDict {
  const v = useContext(Ctx)
  if (!v) throw new Error('useDashboardDict must be used within DashboardI18nProvider')
  return v
}
