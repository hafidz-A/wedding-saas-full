/** Rows asked for per request — Supabase's default `max_rows`. */
export const PAGE_SIZE = 1000

/**
 * Read EVERY row of a list query. PostgREST silently caps one response at the
 * project's `max_rows` (Supabase default 1000): a plain select of a 2,000-guest
 * list returns the first 1,000 with no error. This pages with `.range()` until
 * the exact row count is reached, so it stays correct whatever `max_rows` is
 * set to; without a count (e.g. a test double) it stops at the first short page.
 *
 * `build` must return a FRESH query on every call, selected with
 * `{ count: 'exact' }` and ordered by a unique key last (e.g. `.order('id')`),
 * so pages neither overlap nor skip rows.
 */
export async function fetchAllRows<T>(
  build: () => any,
  maxRows = 20_000,
): Promise<{ data: T[] | null; error: unknown }> {
  const rows: T[] = []
  let total: number | null = null
  while (rows.length < maxRows) {
    const from = rows.length
    const { data, error, count } = await build().range(from, from + PAGE_SIZE - 1)
    if (error) return { data: null, error }
    const page = (data ?? []) as T[]
    rows.push(...page)
    if (typeof count === 'number') total = count
    if (page.length === 0) break
    if (total != null ? rows.length >= total : page.length < PAGE_SIZE) break
  }
  return { data: rows, error: null }
}
