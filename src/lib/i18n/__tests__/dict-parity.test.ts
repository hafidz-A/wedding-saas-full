import { describe, it, expect } from 'vitest'
import { common } from '../dictionaries/common'
import { landing } from '../dictionaries/landing'
import { auth } from '../dictionaries/auth'
import { onboarding } from '../dictionaries/onboarding'
import { templates } from '../dictionaries/templates'
import { dashboard } from '../dictionaries/dashboard'

function keyPaths(obj: unknown, prefix = ''): string[] {
  if (Array.isArray(obj)) {
    return obj.flatMap((v, i) => keyPaths(v, `${prefix}[${i}]`))
  }
  if (obj && typeof obj === 'object') {
    return Object.keys(obj as Record<string, unknown>).flatMap((k) =>
      keyPaths((obj as Record<string, unknown>)[k], prefix ? `${prefix}.${k}` : k),
    )
  }
  return [prefix]
}

describe('i18n dictionary parity (id ⟷ en)', () => {
  const dicts: Array<[string, { id: unknown; en: unknown }]> = [
    ['common', common],
    ['landing', landing],
    ['auth', auth],
    ['onboarding', onboarding],
    ['templates', templates],
    ['dashboard', dashboard],
  ]
  it.each(dicts)('%s has identical id/en key paths', (_name, d) => {
    expect(keyPaths(d.en).sort()).toEqual(keyPaths(d.id).sort())
  })
})
