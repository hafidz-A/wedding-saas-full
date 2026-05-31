import { getLang } from '@/lib/i18n/getLang'
import { getDict } from '@/lib/i18n'
import { SiteNav } from '@/components/site/SiteNav'
import { SiteFooter } from '@/components/site/SiteFooter'
import { SmoothScroll } from '@/components/marketing/SmoothScroll'
import { Hero } from '@/components/marketing/Hero'
import { EmotionalHook } from '@/components/marketing/EmotionalHook'
import { TemplateShowcase } from '@/components/marketing/TemplateShowcase'
import { VibeExploration } from '@/components/marketing/VibeExploration'
import { Features } from '@/components/marketing/Features'
import { HowItWorks } from '@/components/marketing/HowItWorks'
import { Testimonials } from '@/components/marketing/Testimonials'
import { FinalCta } from '@/components/marketing/FinalCta'

export default function HomePage() {
  const lang = getLang()
  const t = getDict(lang)
  
  return (
    <>
      <SiteNav lang={lang} t={t.common} />
      <SmoothScroll />
      <main style={{ backgroundColor: 'var(--color-cream)' }}>
        {/* 1. Cinematic Hero */}
        <Hero t={t.landing.hero} />

        {/* 2. Emotional Hook */}
        <EmotionalHook t={t.landing.emotionalHook} />

        {/* 3. Interactive Template Showcase */}
        <TemplateShowcase t={t.landing.showcase} />

        {/* 4. Wedding Style / Vibe Exploration */}
        <VibeExploration lang={lang} t={t.landing.vibeExploration} />

        {/* 5. Invitation Feature Experience */}
        <Features t={t.landing.features} />

        {/* 6. How It Works */}
        <HowItWorks t={t.landing.howItWorks} />

        {/* 7. Testimonials / Social Proof */}
        <Testimonials t={t.landing.testimonials} />

        {/* 8. Final Emotional CTA */}
        <FinalCta t={t.landing.finalCta} />
      </main>
      <SiteFooter lang={lang} t={t.common} />
    </>
  )
}
