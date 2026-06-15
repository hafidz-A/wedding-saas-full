import { describe, it, expect, afterEach, vi } from 'vitest'
import {
  toastQueueReducer,
  prefersFinePointer,
  prefersReducedMotion,
  TOAST_CAP,
  type Toast,
} from '../feedback'

const mk = (id: number, kind: Toast['kind'] = 'ok'): Toast => ({ id, kind, message: `m${id}` })

describe('toastQueueReducer', () => {
  it('appends an added toast', () => {
    expect(toastQueueReducer([], { type: 'add', toast: mk(1) })).toEqual([mk(1)])
  })

  it('preserves kind (ok/fail)', () => {
    const s = toastQueueReducer([], { type: 'add', toast: mk(1, 'fail') })
    expect(s[0].kind).toBe('fail')
  })

  it('caps the queue, dropping the oldest', () => {
    let s: Toast[] = []
    for (let i = 1; i <= TOAST_CAP + 2; i++) s = toastQueueReducer(s, { type: 'add', toast: mk(i) })
    expect(s).toHaveLength(TOAST_CAP)
    expect(s[0].id).toBe(3) // ids 1 and 2 dropped
    expect(s[s.length - 1].id).toBe(TOAST_CAP + 2)
  })

  it('dismisses by id', () => {
    const s = [mk(1), mk(2), mk(3)]
    expect(toastQueueReducer(s, { type: 'dismiss', id: 2 })).toEqual([mk(1), mk(3)])
  })

  it('ignores an unknown action', () => {
    const s = [mk(1)]
    expect(toastQueueReducer(s, { type: 'nope' } as any)).toBe(s)
  })
})

describe('media helpers', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('prefersFinePointer reads (pointer: fine)', () => {
    vi.stubGlobal('window', { matchMedia: (q: string) => ({ matches: q.includes('fine') }) })
    expect(prefersFinePointer()).toBe(true)
  })

  it('prefersReducedMotion reads the reduce query', () => {
    vi.stubGlobal('window', { matchMedia: (q: string) => ({ matches: q.includes('reduce') }) })
    expect(prefersReducedMotion()).toBe(true)
  })

  it('both return false during SSR (no window)', () => {
    vi.stubGlobal('window', undefined)
    expect(prefersFinePointer()).toBe(false)
    expect(prefersReducedMotion()).toBe(false)
  })
})
