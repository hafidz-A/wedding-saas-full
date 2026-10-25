import { describe, it, expect } from 'vitest'
import { getSchemaRegistry } from '../schemas'
import { tamanBungaSchemaRegistry } from '../schemas/taman-bunga'
import { getTemplatePolicy, validateSectionsAgainstPolicy, computeSafeOrder, canAddSections } from '../templatePolicy'
import { defaultConfig } from '@/all-templates/taman-bunga/defaultConfig.js'
import { sectionRegistry } from '@/all-templates/taman-bunga/registry.js'

const sections = defaultConfig.sections as { id: string; type: string }[]

describe('taman-bunga editor wiring', () => {
  it('resolves its own schema registry', () => {
    expect(getSchemaRegistry('taman-bunga')).toBe(tamanBungaSchemaRegistry)
  })

  it('has a schema for every section type the template renders, and nothing else', () => {
    expect(Object.keys(tamanBungaSchemaRegistry).sort()).toEqual(Object.keys(sectionRegistry).sort())
    for (const s of sections) expect(tamanBungaSchemaRegistry[s.type], s.type).toBeTruthy()
  })

  it('every schema field key exists in the demo props (no dead fields)', () => {
    for (const s of defaultConfig.sections as any[]) {
      for (const f of tamanBungaSchemaRegistry[s.type].fields) {
        expect(f.key in s.props, `${s.type}.${f.key}`).toBe(true)
      }
    }
  })

  it('locks every section in place, gate + closing always on', () => {
    const policy = getTemplatePolicy('taman-bunga')!
    expect(canAddSections(policy)).toBe(false)
    for (const s of sections) expect(policy.locks[s.id]?.lockPosition, s.id).toBe(true)
    expect(policy.locks.cover.lockDisable).toBe(true)
    expect(policy.locks.closing.lockDisable).toBe(true)
    expect(policy.locks.story.lockDisable).toBeFalsy()
    const order = sections.map((s) => s.id)
    expect(computeSafeOrder(order, 'story', 'gallery', policy)).toBeNull()
  })

  it('server guard rejects dropping a section', () => {
    expect(validateSectionsAgainstPolicy('taman-bunga', sections, sections)).toBeNull()
    expect(validateSectionsAgainstPolicy('taman-bunga', sections.slice(0, -1), sections)).not.toBeNull()
  })
})
