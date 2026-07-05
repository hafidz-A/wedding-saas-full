import { describe, it, expect, vi } from 'vitest'

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn()
}))

import { revalidateInvitation } from '../revalidate'
import { revalidatePath } from 'next/cache'

describe('revalidateInvitation', () => {
  it('revalidates the public page, dashboard, and profile', () => {
    revalidateInvitation()
    expect(revalidatePath).toHaveBeenCalledWith('/[template]/[slug]', 'page')
    expect(revalidatePath).toHaveBeenCalledWith('/[template]/[slug]/dashboard', 'page')
    expect(revalidatePath).toHaveBeenCalledWith('/profile', 'page')
  })
})
