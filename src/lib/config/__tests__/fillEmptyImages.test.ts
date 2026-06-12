import { describe, it, expect } from 'vitest'
import { fillEmptyImages } from '../fillEmptyImages'

const section = (type: string, props: any) => ({ id: type, type, enabled: true, props })

describe('fillEmptyImages', () => {
  it('is null-safe and returns non-section configs untouched', () => {
    expect(fillEmptyImages(null)).toBeNull()
    expect(fillEmptyImages({ meta: {} } as any)).toEqual({ meta: {} })
  })

  it('fills empty lovebirds SINGLE image fields contextually', () => {
    const cfg = {
      sections: [
        section('hero', { gateImage: '' }),
        section('ourStory', { stories: [{ title: 'a', image: '' }, { title: 'b', image: '  ' }] }),
        section('brideGroom', { people: [
          { role: 'Bride', name: 'A', photo: '' },
          { role: 'Groom', name: 'R', photo: '' },
        ]}),
        section('weddingParty', { people: [
          { name: 'Maya', role: 'Maid of Honor', photo: '' },
          { name: 'Dimas', role: 'Best Man', photo: '' },
        ]}),
      ],
    }
    const out = fillEmptyImages(cfg)!
    const p = (i: number) => out.sections[i].props as any
    expect(p(0).gateImage).toMatch(/images\.unsplash\.com/)
    expect(p(1).stories[0].image).toMatch(/images\.unsplash\.com/)
    expect(p(1).stories[0].image).not.toBe(p(1).stories[1].image) // cycles, not repeats
    expect(p(2).people[0].photo).not.toBe(p(2).people[1].photo)   // bride ≠ groom
    expect(p(3).people[0].photo).not.toBe(p(3).people[1].photo)   // female vs male pool
  })

  it('COMPACTS photo arrays instead of demo-filling (sparse slots close ranks)', () => {
    const cfg = {
      sections: [
        // slots 1,_,3,_ filled → guests see exactly the couple's 2 photos in order
        section('hero', { blastPhotos: ['https://keep.me/1.jpg', '', 'https://keep.me/3.jpg', '  '] }),
        section('galleryMasonry', { photos: [
          { src: '', alt: 'empty 1' },
          { src: 'https://keep.me/y.jpg', alt: 'y' },
          { src: '   ', alt: 'empty 2' },
        ]}),
        section('footer', { photos: [{ src: '', alt: 'Amara' }] }),
      ],
    }
    const out = fillEmptyImages(cfg)!
    const p = (i: number) => out.sections[i].props as any
    expect(p(0).blastPhotos).toEqual(['https://keep.me/1.jpg', 'https://keep.me/3.jpg'])
    expect(p(1).photos).toEqual([{ src: 'https://keep.me/y.jpg', alt: 'y' }])
    expect(p(2).photos).toEqual([]) // all blank → empty, NEVER a stranger's demo photo
  })

  it('compacts solary photo arrays and fills solary single images', () => {
    const cfg = {
      sections: [
        section('openingGate', { gatePhotos: ['', 'https://keep.me/g.jpg', ''] }),
        section('welcomePlanet', { portrait: '', portrait2: '' }),
        section('storyPlanet', { timeline: [{ label: 'x', photos: ['', 'https://keep.me/t.jpg'] }, { label: 'y', photos: [] }] }),
        section('saturnRing', { photos: [{ src: '', caption: 'First Coffee' }, { src: 'https://keep.me/s.jpg', caption: 'kept' }] }),
        section('teamPlanet', { groups: [
          { label: 'Bridesmaids', members: [{ name: 'Maya', role: 'Maid of Honor', avatar: '' }] },
          { label: 'Groomsmen',   members: [{ name: 'Rio',  role: 'Best Man',      avatar: '' }] },
        ]}),
        section('giftPlanet', { wishlist: [{ name: 'Cookware', description: 'd', image: '', url: '' }] }),
      ],
    }
    const out = fillEmptyImages(cfg)!
    const p = (i: number) => out.sections[i].props as any
    expect(p(0).gatePhotos).toEqual(['https://keep.me/g.jpg'])
    expect(p(1).portrait).toMatch(/images\.unsplash\.com/)
    expect(p(1).portrait2).toMatch(/images\.unsplash\.com/)
    expect(p(1).portrait).not.toBe(p(1).portrait2)
    expect(p(2).timeline[0].photos).toEqual(['https://keep.me/t.jpg'])
    expect(p(2).timeline[1].photos).toEqual([])
    expect(p(3).photos).toEqual([{ src: 'https://keep.me/s.jpg', caption: 'kept' }])
    expect(p(4).groups[0].members[0].avatar).not.toBe(p(4).groups[1].members[0].avatar)
    expect(p(5).wishlist[0].image).toMatch(/images\.unsplash\.com/)
  })

  it('does not invent fields and does not touch non-image strings', () => {
    const cfg = { sections: [section('rsvp', { title: 'Will You Join Us?', subtitle: '' })] }
    const out = fillEmptyImages(cfg)!
    expect(out.sections[0].props).toEqual({ title: 'Will You Join Us?', subtitle: '' })
  })
})
