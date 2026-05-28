'use client'
import { createContext, useContext } from 'react'
import type { Dict, Lang } from '@/lib/i18n'

type DashDict = Dict['dashboard']

const DictCtx = createContext<DashDict | null>(null)
const LangCtx = createContext<Lang>('id')

export function DashboardI18nProvider({
  dict,
  lang,
  children,
}: {
  dict: DashDict
  lang: Lang
  children: React.ReactNode
}) {
  return (
    <LangCtx.Provider value={lang}>
      <DictCtx.Provider value={dict}>{children}</DictCtx.Provider>
    </LangCtx.Provider>
  )
}

export function useDashboardDict(): DashDict {
  const v = useContext(DictCtx)
  if (!v) throw new Error('useDashboardDict must be used within DashboardI18nProvider')
  return v
}

export function useDashboardLang(): Lang {
  return useContext(LangCtx)
}
