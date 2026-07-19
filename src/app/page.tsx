import { getLang } from '@/lib/i18n/getLang'
import { getDict } from '@/lib/i18n'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { toPublicTestimonial } from '@/lib/testimonials/validate'
import type { PublicTestimonial } from '@/lib/testimonials/types'
import { getAllTemplatePlans } from '@/lib/payments/template-plans'
import { toPlanDisplay, type PlanDisplay } from '@/lib/payments/plan-display'
import { getTemplates } from '@/lib/templates/catalog'
import { SiteNav } from '@/components/site/SiteNav'
import { SiteFooter } from '@/components/site/SiteFooter'
import { SmoothScroll } from '@/components/marketing/SmoothScroll'
import { Hero } from '@/components/marketing/Hero'
import { EmotionalHook } from '@/components/marketing/EmotionalHook'
import { VibeExploration } from '@/components/marketing/VibeExploration'
import { Features } from '@/components/marketing/Features'
import { HowItWorks } from '@/components/marketing/HowItWorks'
import { Testimonials } from '@/components/marketing/Testimonials'
import { FinalCta } from '@/components/marketing/FinalCta'
import stack from '@/components/marketing/StackReveal.module.css'

export default async function HomePage() {
  const lang = getLang()
  const t = getDict(lang)

  const [rawPlans, templates] = await Promise.all([getAllTemplatePlans(), getTemplates()])
  const plansByTemplate: Record<string, PlanDisplay[]> = {}
  for (const tid of Object.keys(rawPlans)) plansByTemplate[tid] = rawPlans[tid].map(toPlanDisplay)

  // Approved (visible) customer testimonials. Safe-empty when Supabase is off.
  let testimonials: PublicTestimonial[] = []
  try {
    const db = createSupabaseAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = (await (db.from('testimonials') as any)
      .select('id, rating, body, author_name, is_anonymous, template_id, is_visible, created_at')
      .eq('is_visible', true)
      .order('created_at', { ascending: false })
      .limit(30)) as { data: any[] | null }
    testimonials = (data ?? []).map(toPublicTestimonial)
  } catch { testimonials = [] }

  return (
    <>
      <SiteNav lang={lang} t={t.common} />
      <SmoothScroll />
      <main style={{ backgroundColor: 'var(--color-cream)' }}>
        {/* 1. Cinematic Hero */}
        <Hero t={t.landing.hero} />

        {/* 2-4. Cover-stack: EmotionalHook → Explorer → Features pin and the
            next section scrolls up to cover the previous (desktop only). */}
        <div className={stack.stack}>
          {/* 2. Emotional Hook */}
          <EmotionalHook t={t.landing.emotionalHook} />

          {/* 3. Template + Palette Explorer (replaces the old TemplateShowcase) */}
          <VibeExploration lang={lang} t={t.landing.vibeExploration} plans={plansByTemplate} templates={templates} />

          {/* 4. Invitation Feature Experience */}
          <Features t={t.landing.features} />
        </div>

        {/* 6. How It Works */}
        <HowItWorks t={t.landing.howItWorks} />

        {/* 7. Testimonials / Social Proof */}
        <Testimonials t={t.landing.testimonials} items={testimonials} />

        {/* 8. Final Emotional CTA */}
        <FinalCta t={t.landing.finalCta} />
      </main>
      <SiteFooter lang={lang} t={t.common} />
    </>
  )
}
