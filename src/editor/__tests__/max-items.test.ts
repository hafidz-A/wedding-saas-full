import { describe, it, expect } from 'vitest'
import { getSchemaRegistry } from '../schemas'
import type { FieldDef } from '../schemas/types'

/* Every photo-bearing array field MUST declare maxItems — each gallery layout
   has a photo count past which it visually breaks (coil overlap, masonry belt
   racing, saturn ring fusing shut). This walk covers nested objectArrays too,
   so any FUTURE template/section added to a registry without a cap fails CI. */

function collectViolations(fields: FieldDef[], path: string, out: string[]) {
  for (const f of fields) {
    const p = `${path}.${f.key}`
    if (f.type === 'imageArray' && f.maxItems == null) out.push(p)
    if (f.type === 'objectArray') {
      const holdsImages = f.itemFields.some(
        (it) => it.type === 'image' || it.type === 'imageArray',
      )
      if (holdsImages && f.maxItems == null) out.push(p)
      collectViolations(f.itemFields, p, out)
    }
  }
}

describe('photo array fields declare maxItems', () => {
  for (const template of ['lovebirds', 'solary']) {
    it(`${template}: every image-bearing array field has a cap`, () => {
      const registry = getSchemaRegistry(template)
      const violations: string[] = []
      for (const [type, schema] of Object.entries(registry)) {
        collectViolations(schema.fields, type, violations)
      }
      expect(violations, `fields missing maxItems: ${violations.join(', ')}`).toEqual([])
    })
  }

  it('gallery caps match the render-side clamps', () => {
    const lb = getSchemaRegistry('lovebirds')
    const so = getSchemaRegistry('solary')
    const maxOf = (schema: { fields: FieldDef[] }, key: string) => {
      const f = schema.fields.find((x) => x.key === key)
      return f && 'maxItems' in f ? f.maxItems : undefined
    }
    // Renderers slice() to these same numbers — keep both sides in sync.
    expect(maxOf(lb.gallerySpringCoil, 'photos')).toBe(30)
    expect(maxOf(lb.galleryMasonry, 'photos')).toBe(30)
    expect(maxOf(so.saturnRing, 'photos')).toBe(30)
    expect(maxOf(lb.hero, 'blastPhotos')).toBe(12)
  })
})
