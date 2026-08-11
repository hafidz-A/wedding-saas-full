import 'server-only'
import { AwsClient } from 'aws4fetch'

/**
 * Everything that talks to Cloudflare R2, over its S3-compatible API.
 *
 * R2 replaced Supabase Storage for media because R2 does not bill egress at any
 * volume — a wedding invitation is downloaded once per guest, so per-byte
 * delivery pricing scaled with guest count and was the binding hosting cost.
 *
 * Server-only: these credentials must never reach the client bundle.
 */

function env(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing ${name}`)
  return v
}

let client: AwsClient | null = null
function r2(): AwsClient {
  if (!client) {
    client = new AwsClient({
      service: 's3',
      region: 'auto', // R2 requires the literal string "auto"
      accessKeyId: env('R2_ACCESS_KEY_ID'),
      secretAccessKey: env('R2_SECRET_ACCESS_KEY'),
    })
  }
  return client
}

function endpoint(): string {
  return `https://${env('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`
}

/** Object URL on the S3 API endpoint. Each path segment is encoded separately so
 *  the "/" separators in our `<invitation_id>/<file>` keys survive. */
function objectUrl(key: string): URL {
  const encoded = key.split('/').map(encodeURIComponent).join('/')
  return new URL(`${endpoint()}/${env('R2_BUCKET')}/${encoded}`)
}

/** Public URL a browser fetches, via the bucket's custom domain. */
export function publicUrl(key: string): string {
  return `${env('R2_PUBLIC_HOST').replace(/\/+$/, '')}/${key}`
}

/**
 * Presigned PUT URL for a direct browser upload.
 *
 * `contentType` is attached to the request but is deliberately NOT signed:
 * aws4fetch keeps `content-type` in its UNSIGNABLE_HEADERS set, so only `host`
 * ends up in X-Amz-SignedHeaders. That is the behaviour we want — the browser's
 * PUT records whatever Content-Type it sends without having to match the
 * signature byte-for-byte, so the classic presigned-upload 403 cannot happen.
 * Signing it would buy no security anyway: a caller who can reach /sign chooses
 * the declared type there too, which is exactly why /verify sniffs the real
 * magic bytes and deletes anything that is not genuine media.
 *
 * Do NOT "fix" this by passing `allHeaders: true` — that would sign
 * content-length and user-agent as well, which the browser sets itself, and
 * every upload would 403.
 */
export async function presignPut(
  key: string,
  contentType: string,
  expiresSeconds = 300,
): Promise<string> {
  const url = objectUrl(key)
  url.searchParams.set('X-Amz-Expires', String(expiresSeconds))
  const signed = await r2().sign(
    new Request(url, { method: 'PUT', headers: { 'Content-Type': contentType } }),
    { aws: { signQuery: true } },
  )
  return signed.url
}

/**
 * First `n` bytes of an object plus its full size, via a Range request — so the
 * magic-byte check does not download the whole file the way the Supabase
 * implementation did.
 */
export async function getObjectHead(
  key: string,
  n = 32,
): Promise<{ bytes: Uint8Array; size: number } | null> {
  const res = await r2().fetch(objectUrl(key).toString(), {
    method: 'GET',
    headers: { Range: `bytes=0-${n - 1}` },
  })
  if (res.status === 404) return null
  if (!res.ok && res.status !== 206) return null

  const bytes = new Uint8Array(await res.arrayBuffer())
  // 206 carries "bytes 0-31/12345"; a small object may answer 200 with the lot.
  const contentRange = res.headers.get('content-range')
  const total = contentRange
    ? Number(contentRange.split('/')[1])
    : Number(res.headers.get('content-length') ?? bytes.length)
  return { bytes, size: Number.isFinite(total) ? total : bytes.length }
}

export async function deleteObject(key: string): Promise<void> {
  const res = await r2().fetch(objectUrl(key).toString(), { method: 'DELETE' })
  if (!res.ok && res.status !== 204 && res.status !== 404) {
    throw new Error(`R2 delete failed: ${res.status}`)
  }
}

/** Sum of `<Size>` across a ListObjectsV2 response. Exported for unit testing. */
export function parseSizesFromListXml(xml: string): number {
  let total = 0
  for (const m of xml.matchAll(/<Size>(\d+)<\/Size>/g)) total += Number(m[1])
  return total
}

/** Every `<Key>` in a ListObjectsV2 response. Exported for unit testing. */
export function parseKeysFromListXml(xml: string): string[] {
  return [...xml.matchAll(/<Key>([\s\S]*?)<\/Key>/g)].map((m) => m[1])
}

/**
 * Delete every object under a key prefix, returning how many were removed.
 *
 * This is the R2 half of erasing an invitation's media. Deletion paths must hit
 * BOTH stores while the Supabase originals are still kept as the migration
 * rollback: removing only one leaves the customer's photos live on the other,
 * which for a PDP erasure request is a compliance failure, not just clutter.
 *
 * Callers pass `<invitation_id>/`. A prefix without the trailing slash would
 * also match a different invitation whose id merely starts with the same
 * characters, so the caller's slash is load-bearing.
 */
export async function deletePrefix(prefix: string): Promise<number> {
  let removed = 0
  let token: string | null = null
  do {
    const url = new URL(`${endpoint()}/${env('R2_BUCKET')}`)
    url.searchParams.set('list-type', '2')
    url.searchParams.set('prefix', prefix)
    url.searchParams.set('max-keys', '1000')
    if (token) url.searchParams.set('continuation-token', token)
    const res = await r2().fetch(url.toString(), { method: 'GET' })
    if (!res.ok) throw new Error(`R2 list failed: ${res.status}`)
    const xml = await res.text()

    for (const key of parseKeysFromListXml(xml)) {
      await deleteObject(key)
      removed++
    }

    token = /<IsTruncated>\s*true\s*<\/IsTruncated>/i.test(xml)
      ? (/<NextContinuationToken>([\s\S]*?)<\/NextContinuationToken>/.exec(xml)?.[1] ?? null)
      : null
  } while (token)
  return removed
}

/** Total bytes stored under a key prefix — used for the per-invitation quota. */
export async function sumPrefixBytes(prefix: string): Promise<number> {
  const url = new URL(`${endpoint()}/${env('R2_BUCKET')}`)
  url.searchParams.set('list-type', '2')
  url.searchParams.set('prefix', prefix)
  url.searchParams.set('max-keys', '1000')
  const res = await r2().fetch(url.toString(), { method: 'GET' })
  if (!res.ok) throw new Error(`R2 list failed: ${res.status}`)
  return parseSizesFromListXml(await res.text())
}
