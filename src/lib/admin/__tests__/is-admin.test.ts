import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { isAdminEmail } from '../is-admin'

describe('isAdminEmail', () => {
  const prev = process.env.ADMIN_EMAILS
  beforeEach(() => { process.env.ADMIN_EMAILS = 'a@x.com, Boss@Y.com' })
  afterEach(() => { process.env.ADMIN_EMAILS = prev })

  it('matches allowlisted emails, case + space insensitive', () => {
    expect(isAdminEmail('a@x.com')).toBe(true)
    expect(isAdminEmail('  BOSS@y.com ')).toBe(true)
  })
  it('rejects non-listed / empty / nullish', () => {
    expect(isAdminEmail('nope@x.com')).toBe(false)
    expect(isAdminEmail('')).toBe(false)
    expect(isAdminEmail(undefined)).toBe(false)
    expect(isAdminEmail(null)).toBe(false)
  })
  it('empty ADMIN_EMAILS means nobody is admin', () => {
    process.env.ADMIN_EMAILS = ''
    expect(isAdminEmail('a@x.com')).toBe(false)
  })
})
