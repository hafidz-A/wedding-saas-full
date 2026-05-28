import { common } from './dictionaries/common'
import { landing } from './dictionaries/landing'
import type { Lang } from './config'

const dict = {
  id: { common: common.id, landing: landing.id },
  en: { common: common.en, landing: landing.en },
} as const

export type Dict = (typeof dict)['id']

export function getDict(lang: Lang): Dict {
  return dict[lang]
}

export type { Lang } from './config'
