import { describe, it, expect } from 'vitest'
import { parseYouTubeId, resolveMusicSource } from '../source'

describe('parseYouTubeId', () => {
  const ID = 'dQw4w9WgXcQ'
  it('parses watch URLs', () => {
    expect(parseYouTubeId(`https://www.youtube.com/watch?v=${ID}`)).toBe(ID)
    expect(parseYouTubeId(`https://youtube.com/watch?v=${ID}&t=10s`)).toBe(ID)
    expect(parseYouTubeId(`https://music.youtube.com/watch?v=${ID}&list=ABC`)).toBe(ID)
  })
  it('parses youtu.be short links', () => {
    expect(parseYouTubeId(`https://youtu.be/${ID}`)).toBe(ID)
    expect(parseYouTubeId(`https://youtu.be/${ID}?si=xyz`)).toBe(ID)
  })
  it('parses embed and shorts paths', () => {
    expect(parseYouTubeId(`https://www.youtube.com/embed/${ID}`)).toBe(ID)
    expect(parseYouTubeId(`https://www.youtube.com/shorts/${ID}`)).toBe(ID)
  })
  it('accepts a bare 11-char id', () => {
    expect(parseYouTubeId(ID)).toBe(ID)
  })
  it('returns null for non-YouTube or junk', () => {
    expect(parseYouTubeId('https://example.com/song.mp3')).toBeNull()
    expect(parseYouTubeId('not a url')).toBeNull()
    expect(parseYouTubeId('')).toBeNull()
    expect(parseYouTubeId(null)).toBeNull()
    expect(parseYouTubeId(`https://www.youtube.com/watch?v=tooshort`)).toBeNull()
  })
})

describe('resolveMusicSource', () => {
  it('resolves youtube source', () => {
    expect(resolveMusicSource({ source: 'youtube', youtubeId: 'abc12345678' })).toEqual({
      kind: 'youtube',
      youtubeId: 'abc12345678',
    })
  })
  it('resolves audio (url/upload/library) source', () => {
    expect(resolveMusicSource({ source: 'url', url: 'https://x/s.mp3' })).toEqual({
      kind: 'audio',
      url: 'https://x/s.mp3',
    })
  })
  it('treats a legacy url-only config as audio', () => {
    expect(resolveMusicSource({ url: 'https://x/s.mp3' })).toEqual({
      kind: 'audio',
      url: 'https://x/s.mp3',
    })
  })
  it('falls back to youtubeId without source flag', () => {
    expect(resolveMusicSource({ youtubeId: 'abc12345678' })).toEqual({
      kind: 'youtube',
      youtubeId: 'abc12345678',
    })
  })
  it('returns null for empty/missing', () => {
    expect(resolveMusicSource(null)).toBeNull()
    expect(resolveMusicSource({})).toBeNull()
  })
})
