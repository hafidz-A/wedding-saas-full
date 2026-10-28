import { describe, it, expect } from 'vitest'
import { fetchAllRows, PAGE_SIZE } from '../fetch-all'

/** A query double over `n` rows that serves at most `cap` rows per response, like PostgREST max_rows. */
function table(n: number, cap = PAGE_SIZE, withCount = true) {
  const all = Array.from({ length: n }, (_, i) => ({ id: i }))
  const calls: [number, number][] = []
  const build = () => ({
    range: async (from: number, to: number) => {
      calls.push([from, to])
      const end = Math.min(to + 1, from + cap)
      return { data: all.slice(from, end), error: null, count: withCount ? n : undefined }
    },
  })
  return { build, calls }
}

describe('fetchAllRows', () => {
  it('returns every row past the 1000-row cap', async () => {
    const t = table(2500)
    const { data } = await fetchAllRows<{ id: number }>(t.build)
    expect(data).toHaveLength(2500)
    expect(data!.map((r) => r.id)).toEqual(Array.from({ length: 2500 }, (_, i) => i))
    expect(t.calls).toHaveLength(3)
  })

  it('one request for a small list', async () => {
    const t = table(4)
    expect((await fetchAllRows(t.build)).data).toHaveLength(4)
    expect(t.calls).toHaveLength(1)
  })

  it('stays complete when the server caps lower than a page', async () => {
    const t = table(1200, 500)
    expect((await fetchAllRows(t.build)).data).toHaveLength(1200)
  })

  it('an exact multiple of the page size ends without an extra empty request', async () => {
    const t = table(2000)
    expect((await fetchAllRows(t.build)).data).toHaveLength(2000)
    expect(t.calls).toHaveLength(2)
  })

  it('without a count, stops at the first short page', async () => {
    const t = table(1500, PAGE_SIZE, false)
    expect((await fetchAllRows(t.build)).data).toHaveLength(1500)
  })

  it('surfaces an error instead of a partial list', async () => {
    let n = 0
    const build = () => ({
      range: async () => (n++ === 0
        ? { data: Array.from({ length: PAGE_SIZE }, () => ({})), error: null, count: 3000 }
        : { data: null, error: { message: 'down' } }),
    })
    expect(await fetchAllRows(build)).toEqual({ data: null, error: { message: 'down' } })
  })
})
