import { describe, it, expect } from 'vitest'
import { migrateLovebirdsConfig } from '../migrate-lovebirds'

describe('migrateLovebirdsConfig', () => {
  it('strips guestbook + countdown sections', () => {
    const cfg = {
      sections: [
        { id: 'h', type: 'hero' },
        { id: 'c', type: 'countdown' },
        { id: 'g', type: 'guestbook' },
        { id: 'f', type: 'footer' },
      ],
    }
    const out = migrateLovebirdsConfig(cfg)
    expect(out.sections.map((s: any) => s.type)).toEqual(['hero', 'footer'])
  })

  it('folds a registry section into weddingGift and drops it', () => {
    const cfg = {
      sections: [
        { id: 'wg', type: 'weddingGift', props: { title: 'Gift' } },
        { id: 'r', type: 'registry', props: { title: 'Registry', message: 'Msg', platforms: [{ id: 'p1', name: 'X' }] } },
      ],
    }
    const out = migrateLovebirdsConfig(cfg)
    expect(out.sections.map((s: any) => s.type)).toEqual(['weddingGift'])
    const wg: any = out.sections[0]
    expect(wg.props.registryEnabled).toBe(true)
    expect(wg.props.registryTitle).toBe('Registry')
    expect(wg.props.registryMessage).toBe('Msg')
    expect(wg.props.platforms).toEqual([{ id: 'p1', name: 'X' }])
    expect(wg.props.title).toBe('Gift') // original preserved
  })

  it('does not mutate the input', () => {
    const cfg = { sections: [{ id: 'c', type: 'countdown' }] }
    const snap = JSON.parse(JSON.stringify(cfg))
    migrateLovebirdsConfig(cfg)
    expect(cfg).toEqual(snap)
  })

  it('is idempotent + null-safe', () => {
    expect(migrateLovebirdsConfig(null)).toBeNull()
    const cfg = { sections: [{ id: 'h', type: 'hero' }] }
    expect(migrateLovebirdsConfig(migrateLovebirdsConfig(cfg))).toEqual(migrateLovebirdsConfig(cfg))
  })

  it('drops registry data when no weddingGift section exists', () => {
    const cfg = { sections: [{ id: 'r', type: 'registry', props: { title: 'R' } }] }
    const out = migrateLovebirdsConfig(cfg)
    expect(out.sections).toEqual([])
  })
})
