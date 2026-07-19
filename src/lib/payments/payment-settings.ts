import 'server-only'
import { unstable_cache } from 'next/cache'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export type PaymentMode = 'gateway' | 'manual'

export interface PaymentSettings {
  mode: PaymentMode
  whatsapp: string
  email: string
}

/**
 * Cache tag for the global payment-mode settings row. Written by the admin
 * `updatePaymentSettings` action, which calls `revalidateTag(PAYMENT_SETTINGS_TAG)`
 * for an instant refresh; the `revalidate` TTL below is the fallback staleness
 * bound if a tag invalidation is ever missed.
 */
export const PAYMENT_SETTINGS_TAG = 'payment-settings'
const REVALIDATE_SECONDS = 60

const DEFAULT_SETTINGS: PaymentSettings = { mode: 'gateway', whatsapp: '', email: '' }

/**
 * parsePaymentSettings — pure guard around the `app_settings.value` jsonb blob.
 * Defaults to the safe `gateway` shape on any missing/invalid field so a
 * malformed or partially-written row never breaks the payment flow.
 */
export function parsePaymentSettings(raw: unknown): PaymentSettings {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_SETTINGS }
  const v = raw as Record<string, unknown>
  const mode: PaymentMode = v.mode === 'manual' ? 'manual' : 'gateway'
  const whatsapp = typeof v.whatsapp === 'string' ? v.whatsapp : ''
  const email = typeof v.email === 'string' ? v.email : ''
  return { mode, whatsapp, email }
}

/**
 * getPaymentSettings — source of truth for the global gateway|manual payment
 * mode. Reads `app_settings` (key='payment') via the service-role admin
 * client, modeled on `getTemplatePlans` in `template-plans.ts`.
 *
 * Must degrade gracefully: the `app_settings` table may not exist yet (this
 * migration hasn't been applied), or the row may be missing. Either case
 * (and any other read error) falls back to the default `gateway` settings so
 * the app is safe to run before/without the migration — it must never throw.
 */
export const getPaymentSettings = unstable_cache(
  async (): Promise<PaymentSettings> => {
    try {
      const supabase = createSupabaseAdminClient()
      const { data, error } = await (supabase.from('app_settings') as any)
        .select('value')
        .eq('key', 'payment')
        .maybeSingle()
      if (error) {
        console.error('[getPaymentSettings]', error)
        return { ...DEFAULT_SETTINGS }
      }
      return parsePaymentSettings(data?.value)
    } catch (err) {
      console.error('[getPaymentSettings]', err)
      return { ...DEFAULT_SETTINGS }
    }
  },
  ['payment-settings'],
  { revalidate: REVALIDATE_SECONDS, tags: [PAYMENT_SETTINGS_TAG] },
)
