import { encryptField, decryptField } from './app'

/**
 * Selective encryption for the invitations.config JSONB blob.
 *
 * Only sensitive leaf values are encrypted; the structure (sections array,
 * section types, headings, couple names, body copy) stays plaintext so the
 * config remains diffable/queryable and the renderer needs no changes.
 *
 * Encrypted paths:
 *   - whatsappNumber, email          → anywhere in the tree
 *   - inside any `accounts[]` element → the bank account number + holder name,
 *     detected per-element because the two templates use different keys:
 *       • lovebirds: { name: <bank>, accountNumber, accountHolder }
 *                    → encrypt accountNumber + accountHolder (NOT name = bank)
 *       • solary:    { bank, number, name: <holder> }
 *                    → encrypt number + name (NOT bank)
 *
 * Kept plaintext (per product decision + threat model): coupleName, brideName,
 * groomName, eyebrow, tagline, headings, body text, bank NAME, music, bgGif,
 * theme, section types, and accommodation `phone` numbers (public hotel info,
 * not couple/guest PII).
 *
 * Encrypted leaves are wrapped as { enc: "<ciphertext>" } so both directions
 * are idempotent and a reader can tell an already-encrypted node from
 * plaintext. encryptConfig on an already-encrypted tree is a no-op; likewise
 * decryptConfig on a plaintext tree.
 *
 * NOTE: this deliberately deviates from the abstracted key names in the
 * handoff plan ("accounts[].number / accounts[].name", global "phone"), which
 * only matched the solary shape and would have encrypted lovebirds bank names
 * and public hotel phone numbers. The actual config field names above are the
 * source of truth.
 */

/** Keys encrypted wherever they appear in the tree. */
const GLOBAL_SENSITIVE_KEYS = new Set(['whatsappNumber', 'email'])

/**
 * Sensitive keys for a single `accounts[]` element, chosen by the element's
 * own shape so the ambiguous `name` key (bank name in lovebirds, holder name
 * in solary) is handled correctly.
 */
function accountSensitiveKeys(acc: Record<string, unknown>): Set<string> {
  if ('accountNumber' in acc) return new Set(['accountNumber', 'accountHolder']) // lovebirds
  if ('number' in acc || 'bank' in acc) return new Set(['number', 'name']) // solary
  return new Set(['accountNumber', 'accountHolder', 'number']) // unknown: skip ambiguous 'name'
}

type EncNode = { enc: string }
type Leaf = (v: unknown) => unknown

/** True for a value shaped exactly like { enc: "<string>" }. */
function isEncNode(v: unknown): v is EncNode {
  return (
    typeof v === 'object' &&
    v !== null &&
    !Array.isArray(v) &&
    typeof (v as Record<string, unknown>).enc === 'string' &&
    Object.keys(v as Record<string, unknown>).length === 1
  )
}

/** Wrap a sensitive plaintext leaf as { enc }. Idempotent + skips empties. */
function encLeaf(v: unknown): unknown {
  if (isEncNode(v)) return v // already encrypted
  if (typeof v === 'string' && v.length > 0) return { enc: encryptField(v) }
  return v // empty string, null, number, etc. — leave as-is
}

/** Unwrap an { enc } leaf back to plaintext. Idempotent on plaintext. */
function decLeaf(v: unknown): unknown {
  if (isEncNode(v)) return decryptField(v.enc) ?? ''
  return v
}

/** True when a key/value pair should be transformed by the leaf fn. */
function shouldTransform(value: unknown): boolean {
  return typeof value === 'string' || isEncNode(value)
}

function transformAccount(acc: unknown, leaf: Leaf): unknown {
  if (acc === null || typeof acc !== 'object' || Array.isArray(acc)) return walk(acc, leaf)
  const src = acc as Record<string, unknown>
  const sensitive = accountSensitiveKeys(src)
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(src)) {
    out[key] = sensitive.has(key) && shouldTransform(value) ? leaf(value) : walk(value, leaf)
  }
  return out
}

function walk(node: unknown, leaf: Leaf): unknown {
  if (Array.isArray(node)) return node.map((item) => walk(item, leaf))
  if (node !== null && typeof node === 'object') {
    const src = node as Record<string, unknown>
    const out: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(src)) {
      if (key === 'accounts' && Array.isArray(value)) {
        out[key] = value.map((acc) => transformAccount(acc, leaf))
      } else if (GLOBAL_SENSITIVE_KEYS.has(key) && shouldTransform(value)) {
        out[key] = leaf(value)
      } else {
        out[key] = walk(value, leaf)
      }
    }
    return out
  }
  return node
}

/** Encrypt sensitive leaves. Returns a new object; input is not mutated. */
export function encryptConfig<T>(config: T): T {
  if (config === null || typeof config !== 'object') return config
  return walk(config, encLeaf) as T
}

/** Decrypt sensitive leaves. Returns a new object; input is not mutated. */
export function decryptConfig<T>(config: T): T {
  if (config === null || typeof config !== 'object') return config
  return walk(config, decLeaf) as T
}
