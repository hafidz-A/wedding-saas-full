import { describe, it, expect } from 'vitest'
import { fillEmptyImages } from '../fillEmptyImages'

const section = (type: string, props: any) => ({ id: type, type, enabled: true, props })

describe('fillEmptyImages', () => {
  it('is null-safe and returns non-section configs untouched', () => {
    expect(fillEmptyImages(null)).toBeNull()
    expect(fillEmptyImages({ meta: {} } as any)).toEqual({ meta: {} })
  })

  it('fills empty lovebirds image fields contextually', () => {
    const cfg = {
      sections: [
        section('hero', { gateImage: '', blastPhotos: ['', 'https://keep.me/x.jpg', ''] }),
        section('ourStory', { stories: [{ title: 'a', image: '' }, { title: 'b', image: '  ' }] }),
        section('brideGroom', { people: [
          { role: 'Bride', name: 'A', photo: '' },
          { role: 'Groom', name: 'R', photo: '' },
        ]}),
        section('galleryMasonry', { photos: [{ src: '', alt: 'x' }, { src: 'https://keep.me/y.jpg', alt: 'y' }] }),
        section('weddingParty', { people: [
          { name: 'Maya', role: 'Maid of Honor', photo: '' },
          { name: 'Dimas', role: 'Best Man', photo: '' },
        ]}),
        section('footer', { photos: [{ src: '', alt: 'Amara' }] }),
      ],
    }
    const out = fillEmptyImages(cfg)!
    const p = (i: number) => out.sections[i].props as any
    expect(p(0).gateImage).toMatch(/images\.unsplash\.com/)
    expect(p(0).blastPhotos[0]).toMatch(/images\.unsplash\.com/)
    expect(p(0).blastPhotos[1]).toBe('https://keep.me/x.jpg') // untouched
    expect(p(1).stories[0].image).toMatch(/images\.unsplash\.com/)
    expect(p(1).stories[0].image).not.toBe(p(1).stories[1].image) // cycles, not repeats
    expect(p(2).people[0].photo).not.toBe(p(2).people[1].photo)   // bride ≠ groom
    expect(p(3).photos[0].src).toMatch(/images\.unsplash\.com/)
    expect(p(3).photos[1].src).toBe('https://keep.me/y.jpg')
    expect(p(4).people[0].photo).not.toBe(p(4).people[1].photo)   // female vs male pool
    expect(p(5).photos[0].src).toMatch(/images\.unsplash\.com/)
  })

  it('fills empty solary image fields contextually', () => {
    const cfg = {
      sections: [
        section('openingGate', { gatePhotos: ['', '', ''] }),
        section('welcomePlanet', { portrait: '', portrait2: '' }),
        section('storyPlanet', { timeline: [{ label: 'x', photos: ['', ''] }, { label: 'y', photos: [] }] }),
        section('saturnRing', { photos: [{ src: '', caption: 'First Coffee' }] }),
        section('teamPlanet', { groups: [
          { label: 'Bridesmaids', members: [{ name: 'Maya', role: 'Maid of Honor', avatar: '' }] },
          { label: 'Groomsmen',   members: [{ name: 'Rio',  role: 'Best Man',      avatar: '' }] },
        ]}),
        section('giftPlanet', { wishlist: [{ name: 'Cookware', description: 'd', image: '', url: '' }] }),
      ],
    }
    const out = fillEmptyImages(cfg)!
    const p = (i: number) => out.sections[i].props as any
    expect(p(0).gatePhotos.every((u: string) => u.includes('images.unsplash.com'))).toBe(true)
    expect(p(1).portrait).toMatch(/images\.unsplash\.com/)
    expect(p(1).portrait2).toMatch(/images\.unsplash\.com/)
    expect(p(1).portrait).not.toBe(p(1).portrait2)
    expect(p(2).timeline[0].photos[0]).toMatch(/images\.unsplash\.com/)
    expect(p(3).photos[0].src).toMatch(/images\.unsplash\.com/)
    expect(p(4).groups[0].members[0].avatar).not.toBe(p(4).groups[1].members[0].avatar)
    expect(p(5).wishlist[0].image).toMatch(/images\.unsplash\.com/)
  })

  it('does not invent fields and does not touch non-image strings', () => {
    const cfg = { sections: [section('rsvp', { title: 'Will You Join Us?', subtitle: '' })] }
    const out = fillEmptyImages(cfg)!
    expect(out.sections[0].props).toEqual({ title: 'Will You Join Us?', subtitle: '' })
  })
})
