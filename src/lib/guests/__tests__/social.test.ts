import { describe, it, expect } from 'vitest'
import { normalizeSocialHandle as norm, socialDmUrl } from '../social'

describe('normalizeSocialHandle — instagram', () => {
  it.each([
    ['rani.adi', 'rani.adi'],
    ['@Rani_Adi', 'rani_adi'],
    ['  @rani.adi  ', 'rani.adi'],
    ['https://www.instagram.com/rani.adi/', 'rani.adi'],
    ['instagram.com/rani.adi?igsh=abc123', 'rani.adi'],
    ['https://instagram.com/rani.adi/reels/', 'rani.adi'],
    ['ig.me/m/rani.adi', 'rani.adi'],
  ])('%s → %s', (input, out) => expect(norm(input, 'instagram')).toBe(out))

  it.each([
    [''], ['   '], ['@'], ['rani adi'], ['a'.repeat(31)], ['rani!adi'],
    ['https://instagram.com/p/Cx123/'], ['https://facebook.com/rani.adi'], ['https://evil.example/rani'],
  ])('rejects %j', (input) => expect(norm(input, 'instagram')).toBeNull())
})

describe('normalizeSocialHandle — facebook', () => {
  it.each([
    ['rani.adi', 'rani.adi'],
    ['@Rani.Adi', 'Rani.Adi'],
    ['https://www.facebook.com/rani.adi', 'rani.adi'],
    ['facebook.com/rani.adi?mibextid=xyz', 'rani.adi'],
    ['https://m.facebook.com/profile.php?id=100012345678', '100012345678'],
    ['fb.com/rani.adi', 'rani.adi'],
    ['m.me/rani.adi', 'rani.adi'],
    ['https://www.messenger.com/t/rani.adi', 'rani.adi'],
    ['100012345678', '100012345678'],
  ])('%s → %s', (input, out) => expect(norm(input, 'facebook')).toBe(out))

  it.each([
    ['ran'], ['rani_adi'], ['https://facebook.com/groups/abc'], ['https://facebook.com/share/xyz'],
    ['https://instagram.com/rani.adi'], ['facebook.com/profile.php'],
  ])('rejects %j', (input) => expect(norm(input, 'facebook')).toBeNull())
})

describe('socialDmUrl', () => {
  it('builds DM links', () => {
    expect(socialDmUrl('rani.adi', 'instagram')).toBe('https://ig.me/m/rani.adi')
    expect(socialDmUrl('100012345678', 'facebook')).toBe('https://m.me/100012345678')
  })
})
