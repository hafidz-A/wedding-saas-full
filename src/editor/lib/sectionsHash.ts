/**
 * Content fingerprint of the editor's section list — the basis for the section
 * editor's optimistic-concurrency check.
 *
 * Why hash ONLY the sections (not the whole config):
 *   One invitation row is written by FIVE editing surfaces — the section editor
 *   plus the Palette / Music / Title-&-Description (meta) / Ornament sub-tabs.
 *   The old guard compared the row's `updated_at`, so ANY sibling save bumped the
 *   token and the next section save tripped a FALSE "another tab is open" 409 —
 *   even though those sub-tabs only touch keys the section save preserves and can
 *   never conflict with section content. The section editor only owns
 *   `config.sections`, so fingerprinting just that array makes sub-tab saves
 *   invisible to it: a real 409 happens only when the SECTIONS themselves changed
 *   under us — and that holds across devices, with no fragile cross-tab timestamp
 *   bookkeeping.
 *
 * Isomorphic + deterministic: client and server must derive the SAME value for
 * the SAME logical content, so this runs in both runtimes and serializes with
 * sorted keys (object key order must not change the hash). Both sides hash the
 * DECRYPTED (plaintext) sections — the client hashes the config it loaded, the
 * server hashes `decryptConfig(stored).sections` — so the encrypted-at-rest
 * leaves (account numbers, etc.) don't cause a representation mismatch.
 */

/** Deterministic JSON: object keys sorted recursively so key order can't shift
 *  the fingerprint. Arrays keep their order (section order is meaningful). */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null'
  if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']'
  const obj = value as Record<string, unknown>
  const keys = Object.keys(obj).sort()
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + stableStringify(obj[k])).join(',') + '}'
}

/**
 * Stable fingerprint of a sections array. A non-array input (missing/empty
 * config) normalizes to `[]` so an empty config hashes identically on both
 * sides. FNV-1a/32 — collisions are astronomically unlikely here, and the only
 * cost of one would be a missed conflict (same risk class as any hash-based
 * optimistic-concurrency token).
 */
export function hashSections(sections: unknown): string {
  const arr = Array.isArray(sections) ? sections : []
  const json = stableStringify(arr)
  let h = 0x811c9dc5
  for (let i = 0; i < json.length; i++) {
    h ^= json.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(16).padStart(8, '0')
}
