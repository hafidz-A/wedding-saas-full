/**
 * Reusable Supabase test-double for L2 integration tests (route handlers +
 * server actions). NO network, NO real DB — every response is scripted per
 * (table, operation), so a route's branching (found / not-found / db-error)
 * can be exercised deterministically.
 *
 * Supports the chains actually used in this codebase:
 *   .from(t).select(..).eq(..).maybeSingle()           → 'select' result
 *   .from(t).select(..).eq(..).single()                → 'select' result
 *   .from(t).insert(..).select(..).single()            → 'insert' result
 *   .from(t).insert(..)              (awaited)          → 'insert' result
 *   .from(t).update(..).eq(..)       (awaited)          → 'update' result
 *   .from(t).delete().eq(..)         (awaited)          → 'delete' result
 *   .rpc(name, args)                 (awaited)          → rpc[name] result
 *
 * `client._calls` records every insert/update/delete/rpc so tests can assert
 * WHAT was written (e.g. that a field arrived encrypted, not plaintext).
 */

export interface FakeResult {
  data?: any
  error?: any
  /** Some Supabase calls return a row count (e.g. `{ count: 'exact', head: true }`). */
  count?: number
}

type Op = 'select' | 'insert' | 'update' | 'delete' | 'upsert'

export interface FakeStorageScript {
  /** Result of `.storage.from(b).list(path)` — `data` is an array of file rows. */
  list?: FakeResult
  /** Result of `.storage.from(b).upload(path, bytes)`. */
  upload?: FakeResult
  /** publicUrl returned by `.storage.from(b).getPublicUrl(path)`. */
  publicUrl?: string
}

export interface FakeScript {
  /** Per-RPC-name results, e.g. { rl_hit: { data: true } }. */
  rpc?: Record<string, FakeResult>
  /**
   * Per-table, per-operation results. A single result is reused for every call;
   * an ARRAY is consumed in order (the last element repeats) — use this when a
   * route does two different selects on the same table (e.g. onboarding's
   * slug-availability check followed by the draft-count query).
   */
  tables?: Record<string, Partial<Record<Op, FakeResult | FakeResult[]>>>
  /** Storage bucket behaviour (for the upload route). */
  storage?: FakeStorageScript
  /** Fallback when a (table, op) is not scripted. */
  default?: FakeResult
}

export interface FakeCall {
  kind: 'insert' | 'update' | 'delete' | 'upsert' | 'rpc' | 'select' | 'filter'
  table?: string
  name?: string
  value?: any
  args?: any
  /** For 'filter' calls: the `.eq(column, value)` arguments (IDOR-scope asserts). */
  column?: string
}

export interface FakeSupabase {
  _calls: FakeCall[]
  rpc: (name: string, args?: any) => Promise<FakeResult>
  from: (table: string) => any
  storage: { from: (bucket: string) => any }
  /** Convenience: last recorded call of a given kind (or undefined). */
  lastCall: (kind: FakeCall['kind']) => FakeCall | undefined
}

export function createFakeSupabase(script: FakeScript = {}): FakeSupabase {
  const calls: FakeCall[] = []
  const cursors = new Map<string, number>()
  const resultFor = (table: string, op: Op): FakeResult => {
    const scripted = script.tables?.[table]?.[op]
    if (Array.isArray(scripted)) {
      const key = `${table}:${op}`
      const i = cursors.get(key) ?? 0
      cursors.set(key, Math.min(i + 1, scripted.length - 1))
      return scripted[i] ?? script.default ?? { data: null, error: null }
    }
    if (scripted) return scripted
    return script.default ?? { data: null, error: null }
  }

  const client: FakeSupabase = {
    _calls: calls,
    lastCall(kind) {
      for (let i = calls.length - 1; i >= 0; i--) if (calls[i].kind === kind) return calls[i]
      return undefined
    },
    rpc(name: string, args?: any) {
      calls.push({ kind: 'rpc', name, args })
      return Promise.resolve(script.rpc?.[name] ?? { data: true, error: null })
    },
    from(table: string) {
      // Default op is 'select'; .insert/.update/.delete switch it. .select() does
      // NOT switch (so `.insert().select().single()` still resolves the insert).
      let op: Op = 'select'
      const settle = () => Promise.resolve(resultFor(table, op))
      const builder: any = {
        select() {
          return builder
        },
        insert(value: any) {
          op = 'insert'
          calls.push({ kind: 'insert', table, value })
          return builder
        },
        update(value: any) {
          op = 'update'
          calls.push({ kind: 'update', table, value })
          return builder
        },
        upsert(value: any) {
          op = 'upsert'
          calls.push({ kind: 'upsert', table, value })
          return builder
        },
        delete() {
          op = 'delete'
          calls.push({ kind: 'delete', table })
          return builder
        },
        eq: (column?: string, value?: any) => {
          calls.push({ kind: 'filter', table, column, value })
          return builder
        },
        neq: () => builder,
        in: (column?: string, value?: any) => {
          calls.push({ kind: 'filter', table, column, value })
          return builder
        },
        is: (column?: string, value?: any) => {
          calls.push({ kind: 'filter', table, column, value })
          return builder
        },
        not: () => builder,
        gte: () => builder,
        lte: () => builder,
        order: () => builder,
        limit: () => builder,
        range: () => builder,
        maybeSingle: () => settle(),
        single: () => settle(),
        then: (onF: any, onR: any) => settle().then(onF, onR),
      }
      return builder
    },
    storage: {
      from(bucket: string) {
        return {
          list: () => Promise.resolve(script.storage?.list ?? { data: [], error: null }),
          upload: (path: string, bytes: any) => {
            calls.push({ kind: 'insert', table: `storage:${bucket}`, value: { path, size: bytes?.length } })
            return Promise.resolve(script.storage?.upload ?? { data: { path }, error: null })
          },
          getPublicUrl: (path: string) => ({
            data: { publicUrl: script.storage?.publicUrl ?? `https://cdn.test/${bucket}/${path}` },
          }),
        }
      },
    },
  }
  return client
}
