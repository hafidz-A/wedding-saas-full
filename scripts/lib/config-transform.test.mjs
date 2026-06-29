// scripts/lib/config-transform.test.mjs
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { firstName, deriveNames, replaceSections, enableAll } from './config-transform.mjs'

describe('firstName', () => {
  it('extracts first word', () => {
    assert.equal(firstName('Nanda Putri Sari'), 'Nanda')
  })
  it('handles single name', () => {
    assert.equal(firstName('Nanda'), 'Nanda')
  })
  it('trims leading whitespace', () => {
    assert.equal(firstName('  Made Wirawan'), 'Made')
  })
})

describe('deriveNames', () => {
  const input = { brideName: 'Nanda Putri', groomName: 'Made Wirawan', weddingDate: '2026-11-15T16:00' }
  const result = deriveNames(input)

  it('coupleName is bride & groom first names', () => {
    assert.equal(result.coupleName, 'Nanda & Made')
  })
  it('monogram uses initials', () => {
    assert.equal(result.monogram, 'N & M')
  })
  it('hashtag combines first names', () => {
    assert.equal(result.hashtag, '#NandaAndMade')
  })
  it('formattedDate is a non-empty string', () => {
    assert.ok(result.formattedDate.length > 0)
    assert.match(result.formattedDate, /2026/)
    assert.match(result.formattedDate, /November/)
    assert.match(result.formattedDate, /Sunday/)
  })
})

describe('replaceSections', () => {
  function makeConfig() {
    return {
      meta: {},
      sections: [
        { type: 'hero',      props: { coupleName: 'OLD', brideName: 'OLD', groomName: 'OLD', weddingDate: 'OLD' }, enabled: true },
        { type: 'countdown', props: { weddingDate: 'OLD' }, enabled: true },
        { type: 'ourStory',  props: { stories: [{ date: 'OLD', title: 'First' }, { date: 'OLD', title: 'Wedding Day' }] }, enabled: true },
        { type: 'eventDetails', props: { events: [{ id: 'ceremony', date: 'OLD', location: 'OLD' }, { id: 'dress-code', date: 'OLD', location: 'OLD' }] }, enabled: true },
        { type: 'brideGroom', props: { people: [{ role: 'Bride', name: 'OLD', parents: 'OLD' }, { role: 'Groom', name: 'OLD', parents: 'OLD' }] }, enabled: true },
        { type: 'weddingGift', props: { accounts: [{ accountHolder: 'OLD' }] }, enabled: true },
        { type: 'footer',    props: { coupleName: 'OLD', monogram: 'OLD', hashtag: 'OLD' }, enabled: true },
        { type: 'schedule',  props: { events: [] }, enabled: true },
      ],
    }
  }

  const args = { brideName: 'Nanda Putri', groomName: 'Made Wirawan', weddingDate: '2026-11-15T16:00', venue: 'Grand Ballroom' }
  const config = replaceSections(makeConfig(), args)

  it('replaces hero coupleName', () => assert.equal(config.sections[0].props.coupleName, 'Nanda & Made'))
  it('replaces hero brideName with first name only', () => assert.equal(config.sections[0].props.brideName, 'Nanda'))
  it('replaces countdown weddingDate', () => assert.equal(config.sections[1].props.weddingDate, '2026-11-15T16:00'))
  it('replaces only last ourStory card date', () => {
    assert.equal(config.sections[2].props.stories[0].date, 'OLD')   // unchanged
    assert.match(config.sections[2].props.stories[1].date, /2026/)  // replaced
  })
  it('replaces ceremony event location', () => assert.equal(config.sections[3].props.events[0].location, 'Grand Ballroom'))
  it('does not replace dress-code event location', () => assert.equal(config.sections[3].props.events[1].location, 'OLD'))
  it('replaces bride name in brideGroom', () => assert.equal(config.sections[4].props.people[0].name, 'Nanda Putri'))
  it('replaces first gift account holder', () => assert.equal(config.sections[5].props.accounts[0].accountHolder, 'Nanda Putri'))
  it('replaces footer hashtag', () => assert.equal(config.sections[6].props.hashtag, '#NandaAndMade'))
  it('does not crash on schedule (no special handling)', () => assert.ok(config.sections[7]))
  it('sets canonical couple from first names', () => assert.deepEqual(config.couple, { name1: 'Nanda', name2: 'Made' }))
  it('sets meta titleSuffix and no denormalized title', () => {
    assert.equal(config.meta.titleSuffix, 'Our Wedding')
    assert.equal(config.meta.title, undefined)
  })
})

describe('enableAll', () => {
  it('sets enabled: true on all sections', () => {
    const config = { sections: [{ type: 'hero', enabled: false }, { type: 'gallery', enabled: false }] }
    enableAll(config)
    assert.ok(config.sections.every(s => s.enabled === true))
  })
})
