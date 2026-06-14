import { describe, it, expect, beforeEach, vi } from 'vitest'

const signOut = vi.fn().mockResolvedValue({ error: null })
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: () => ({ auth: { signOut } }),
}))
import { POST } from '../route'

beforeEach(() => signOut.mockClear())

function logout(accept: string) {
  return new Request('http://localhost/api/auth/logout', { method: 'POST', headers: { accept } })
}

describe('POST /api/auth/logout', () => {
  it('signs out and returns JSON for an AJAX caller', async () => {
    const res = await POST(logout('application/json'))
    expect(signOut).toHaveBeenCalledOnce()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
  })

  it('redirects to home (303) for a plain form submit', async () => {
    const res = await POST(logout('text/html'))
    expect(signOut).toHaveBeenCalledOnce()
    expect(res.status).toBe(303)
    expect(res.headers.get('location')).toBe('http://localhost/')
  })
})
