'use client'

/**
 * Shim — the toast system was promoted to src/components/ui/FeedbackProvider
 * (2026-07 follow-ups) so /admin can use it too. This wrapper keeps the
 * dashboard's i18n default copy and the old import path for ~17 consumers.
 */
import { type ReactNode } from 'react'
import { FeedbackProvider as UiFeedbackProvider } from '@/components/ui/FeedbackProvider'
import { useDashboardDict } from '@/app/[template]/[slug]/dashboard/DashboardI18nProvider'

export { useFeedback, type FeedbackApi } from '@/components/ui/FeedbackProvider'

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const fb = useDashboardDict().feedback
  return <UiFeedbackProvider defaults={{ ok: fb.ok, fail: fb.fail }}>{children}</UiFeedbackProvider>
}
