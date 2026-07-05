import { describe, it, expect, beforeEach, vi } from 'vitest'
import { sendAdminEmail } from '../send'

describe('sendAdminEmail', () => {
  beforeEach(() => { vi.restoreAllMocks(); process.env.RESEND_API_KEY = 'k'; process.env.RESEND_FROM = 'x@fincards.land' })

  it('POSTs to Resend and returns true on ok', async () => {
    const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const ok = await sendAdminEmail({ to: 'a@b.com', subject: 'Hi', html: '<p>Hi</p>' })
    expect(ok).toBe(true)
    expect(fetchMock).toHaveBeenCalledWith('https://api.resend.com/emails', expect.any(Object))
  })
  it('returns false (no throw) when RESEND is not configured', async () => {
    process.env.RESEND_API_KEY = ''
    await expect(sendAdminEmail({ to: 'a@b.com', subject: 'x', html: 'x' })).resolves.toBe(false)
  })
})
