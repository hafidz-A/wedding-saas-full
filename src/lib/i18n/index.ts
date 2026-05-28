import { common } from './dictionaries/common'
import { landing } from './dictionaries/landing'
import { auth } from './dictionaries/auth'
import { onboarding } from './dictionaries/onboarding'
import { templates } from './dictionaries/templates'
import type { Lang } from './config'

const dict = {
  id: {
    common: common.id,
    landing: landing.id,
    auth: auth.id,
    onboarding: onboarding.id,
    templates: templates.id,
  },
  en: {
    common: common.en,
    landing: landing.en,
    auth: auth.en,
    onboarding: onboarding.en,
    templates: templates.en,
  },
} as const

export type Dict = (typeof dict)['id']

export function getDict(lang: Lang): Dict {
  return dict[lang]
}

export type { Lang } from './config'
