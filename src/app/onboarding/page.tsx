import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getLang } from '@/lib/i18n/getLang'
import { getDict } from '@/lib/i18n'
import { SiteNav } from '@/components/site/SiteNav'
import OnboardingForm from './OnboardingForm'
import { getTemplatePlans } from '@/lib/payments/template-plans'
import { DEFAULT_BASE_QUOTA } from '@/lib/payments/quota'

/**
 * Onboarding wizard — render the 5-field form for an authenticated user.
 *
 * When the visitor isn't signed in, bounce them to /signup with a
 * `?next=` pointer back to this URL (template/plan params preserved)
 * so the post-auth flow lands them back on the create-invitation step
 * instead of dropping them on the homepage.
 *
 * One account may own many invitations, so onboarding always lets the
 * user create a new one (no redirect to an existing invitation).
 */
export default async function OnboardingPage({
  searchParams = {},
}: {
  searchParams?: Record<string, string | string[] | undefined>
}) {
  const lang = getLang()
  const t = getDict(lang)
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    // Rebuild the current URL so post-signup brings the user back here with
    // the same template/plan picks intact.
    const qs = new URLSearchParams()
    for (const [k, v] of Object.entries(searchParams)) {
      if (v === undefined) continue
      if (Array.isArray(v)) v.forEach((x) => qs.append(k, x))
      else qs.append(k, v)
    }
    const here = qs.toString() ? `/onboarding?${qs.toString()}` : '/onboarding'
    redirect(`/signup?next=${encodeURIComponent(here)}`)
  }

  // Floor the guest-quota stepper on the chosen plan's DB base (falls back to
  // the client-safe default when the row/template lookup comes up empty).
  const templateParam = typeof searchParams.template === 'string' ? searchParams.template : ''
  const planParam = typeof searchParams.plan === 'string' ? searchParams.plan : 'basic'
  const plansForTemplate = await getTemplatePlans(templateParam || 'lovebirds')
  const chosen = plansForTemplate.find((p) => p.plan_code === planParam)
  const planBase = chosen?.base_guest_quota ?? (DEFAULT_BASE_QUOTA[planParam] ?? 200)
  const planPrice = chosen?.price_idr ?? 0

  return (
    <>
      <SiteNav lang={lang} t={t.common} />
      <OnboardingForm email={user.email ?? ''} dict={t.onboarding} lang={lang} planBase={planBase} planPrice={planPrice} />
    </>
  )
}

