import { describe, it, expect, beforeAll } from 'vitest'
import { randomBytes, createHmac, createCipheriv, createDecipheriv } from 'node:crypto'
import { hashToken, encryptToken, decryptToken } from '../token'

let KEY: Buffer
beforeAll(() => {
  const b64 = randomBytes(32).toString('base64')
  process.env.GUESTS_ENCRYPTION_KEY = b64
  KEY = Buffer.from(b64, 'base64')
})

// --- EXACT mirror of scripts/backfill-rsvp-tokens.mjs crypto (keep in sync) ---
const scriptHash = (invId: string, tok: string) => {
  const sub = createHmac('sha256', KEY).update('rsvp-token-hmac-v1').digest()
  return createHmac('sha256', sub).update(`${invId}:${tok}`).digest('hex')
}
const scriptEnc = (tok: string) => {
  const iv = randomBytes(12)
  const c = createCipheriv('aes-256-gcm', KEY, iv)
  const ct = Buffer.concat([c.update(tok, 'utf8'), c.final()])
  return Buffer.concat([iv, ct, c.getAuthTag()]).toString('base64')
}
const scriptDec = (payload: string) => {
  const buf = Buffer.from(payload, 'base64')
  const iv = buf.subarray(0, 12)
  const tag = buf.subarray(buf.length - 16)
  const ct = buf.subarray(12, buf.length - 16)
  const d = createDecipheriv('aes-256-gcm', KEY, iv)
  d.setAuthTag(tag)
  return Buffer.concat([d.update(ct), d.final()]).toString('utf8')
}

describe('backfill ↔ runtime token parity', () => {
  it('script hash equals hashToken for the same invitation+token', () => {
    expect(scriptHash('inv-1', '123456')).toBe(hashToken('inv-1', '123456'))
    expect(scriptHash('inv-zzz', '000999')).toBe(hashToken('inv-zzz', '000999'))
  })
  it('runtime decryptToken can read a script-encrypted token', () => {
    expect(decryptToken(scriptEnc('428913'))).toBe('428913')
  })
  it('script can decrypt a runtime-encrypted token', () => {
    expect(scriptDec(encryptToken('428913'))).toBe('428913')
  })
})
