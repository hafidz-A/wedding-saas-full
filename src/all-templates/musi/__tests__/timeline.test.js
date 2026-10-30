import { describe, expect, it } from 'vitest'
import {
  APPEAR,
  BEATS,
  LANDMARKS,
  RIVER_STOPS,
  SEGMENTS,
  buildTimeline,
  riverAt,
  storyBeats,
} from '../config/timeline.js'
import { buildMusiSeedConfig } from '../seed.js'
import { defaultConfig } from '../defaultConfig.js'
import { MUSI_PALETTE_ORDER, MUSI_PALETTES } from '../config/palettes.js'
import { TEMPLATE_PALETTES } from '@/lib/config/palette-allowlist'
import { getTemplatePolicy } from '@/editor/templatePolicy'
import { getSchemaRegistry } from '@/editor/schemas'

const ALL = new Set(defaultConfig.sections.map((s) => s.type))
const seg = (key) => SEGMENTS.find((s) => s.key === key)

describe('musi timeline', () => {
  it('maps scroll to the journey monotonically, and back', () => {
    const tl = buildTimeline(ALL)
    let prev = -1
    for (let p = 0; p <= 1.0001; p += 0.01) {
      const t = tl.toNominal(p)
      expect(t).toBeGreaterThanOrEqual(prev)
      expect(tl.toProgress(t)).toBeCloseTo(Math.min(1, p), 5)
      prev = t
    }
  })

  it('squeezes a switched-off section instead of leaving a gap', () => {
    const full = buildTimeline(ALL).trackVh
    const noStory = new Set(ALL)
    noStory.delete('musiStory')
    expect(buildTimeline(noStory).trackVh).toBeLessThan(full)
  })

  it('moves the boat forward only', () => {
    let prev = 0
    for (let t = 0; t <= 1; t += 0.002) {
      const u = riverAt(t)
      expect(u).toBeGreaterThanOrEqual(prev - 1e-9)
      prev = u
    }
    expect(riverAt(1)).toBeCloseTo(RIVER_STOPS.gallery, 6)
  })

  // The owner's order at every landmark: the boat arrives and frames it →
  // the landmark pops up → that section's card shows → ride on.
  const order = [
    ['couple', ['ampera'], BEATS.groom[0]],
    ['story', ['kutoBesak'], storyBeats(3)[0][0]],
    ['saveDate', ['masjidAgung'], BEATS.saveDate[0]],
    ['events', ['limasRow', 'rafts'], BEATS.events[0]],
    ['gallery', ['lrt', 'pempek', 'kampung'], BEATS.gallery[0]],
  ]
  it.each(order)('%s: the boat arrives, the landmark pops up, then the card shows', (key, marks, cardAt) => {
    const s = seg(key)
    for (const m of marks) {
      expect(APPEAR[m]).toBeGreaterThan(s.from)
      expect(APPEAR[m]).toBeLessThan(cardAt)
      // by the time it pops up the boat has covered most of the ride in
      const prevStop = riverAt(s.from)
      const share = (riverAt(APPEAR[m]) - prevStop) / (RIVER_STOPS[key] - prevStop)
      expect(share).toBeGreaterThan(0.6)
    }
  })

  it('pops the landmarks of one stretch one after another', () => {
    expect(APPEAR.limasRow).toBeLessThan(APPEAR.rafts)
    expect(APPEAR.lrt).toBeLessThan(APPEAR.pempek)
    expect(APPEAR.pempek).toBeLessThan(APPEAR.kampung)
  })

  it('builds the Ampera before the boat goes under it', () => {
    expect(riverAt(seg('couple').to)).toBeLessThan(LANDMARKS.ampera)
    expect(riverAt(APPEAR.ampera)).toBeLessThan(LANDMARKS.ampera)
  })

  it('never shows Pulau Kemaro', () => {
    expect(Object.keys(LANDMARKS).join(' ').toLowerCase()).not.toContain('kemaro')
  })
})

describe('musi wiring', () => {
  it('seeds a couple without the demo couple’s personal data', () => {
    const c = buildMusiSeedConfig({ brideName: 'Siti Aminah', groomName: 'Budi Santoso', weddingDate: '2027-03-01T09:00', venue: 'Gedung A' })
    const props = (t) => c.sections.find((s) => s.type === t).props
    expect(c.couple).toEqual({ name1: 'Siti', name2: 'Budi' })
    expect(props('musiCouple').groomParents).toBe('')
    expect(props('musiCouple').bridePhoto).toBe('')
    expect(props('musiGift').accounts).toEqual([])
    expect(props('musiGallery').photos).toEqual([])
    expect(props('guestbook').initialNotes).toEqual([])
    expect(props('musiSaveDate').date).toBe('2027-03-01T09:00')
    expect(props('musiEvents').venue).toBe('Gedung A')
  })

  it('has an editor schema for every section type and locks the order', () => {
    const schemas = getSchemaRegistry('musi')
    for (const t of ALL) expect(schemas[t], t).toBeTruthy()
    const policy = getTemplatePolicy('musi')
    expect(policy.fixedSections).toBe(true)
    expect(policy.locks.cover.lockDisable).toBe(true)
    expect(policy.locks.closing.lockDisable).toBe(true)
    for (const s of defaultConfig.sections) expect(policy.locks[s.id], s.id).toBeTruthy()
  })

  it('allows exactly the palettes the template ships', () => {
    expect(TEMPLATE_PALETTES.musi).toEqual(MUSI_PALETTE_ORDER)
    for (const k of MUSI_PALETTE_ORDER) expect(MUSI_PALETTES[k].scene.roof).toMatch(/^#/)
  })
})
