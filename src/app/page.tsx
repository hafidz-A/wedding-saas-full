import { getLang } from '@/lib/i18n/getLang'
import { getDict } from '@/lib/i18n'
import { SiteNav } from '@/components/site/SiteNav'
import { SiteFooter } from '@/components/site/SiteFooter'
import { Hero } from '@/components/marketing/Hero'
import { Features } from '@/components/marketing/Features'
import { TemplateShowcase } from '@/components/marketing/TemplateShowcase'
import { HowItWorks } from '@/components/marketing/HowItWorks'
import { FinalCta } from '@/components/marketing/FinalCta'

export default function HomePage() {
  const lang = getLang()
  const t = getDict(lang)
  return (
    <>
      <SiteNav lang={lang} t={t.common} />
      <main>
        <Hero t={t.landing.hero} />
        <Features t={t.landing.features} />
        <TemplateShowcase t={t.landing.showcase} />
        <HowItWorks t={t.landing.howItWorks} />
        <FinalCta t={t.landing.finalCta} />
      </main>
      <SiteFooter lang={lang} t={t.common} />
    </>
  )
}
