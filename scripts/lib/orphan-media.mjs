/**
 * Pure helpers for the orphan-media purge. Kept separate from the script so the
 * "which files die" decision is unit-tested — it is a destructive call, and the
 * S3 listing shape is the only thing standing between a live invitation's photos
 * and a delete loop.
 */

/** Every <Contents> entry of a ListObjectsV2 response, in listing order. */
export function parseObjectsFromListXml(xml) {
  const out = []
  for (const block of xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)) {
    const key = /<Key>([\s\S]*?)<\/Key>/.exec(block[1])?.[1]
    const size = Number(/<Size>(\d+)<\/Size>/.exec(block[1])?.[1] ?? 0)
    if (key) out.push({ key, size })
  }
  return out
}

/** Continuation token when the listing is truncated, else null. */
export function nextContinuationToken(xml) {
  if (!/<IsTruncated>\s*true\s*<\/IsTruncated>/i.test(xml)) return null
  return /<NextContinuationToken>([\s\S]*?)<\/NextContinuationToken>/.exec(xml)?.[1] ?? null
}

/**
 * Split objects by whether their `<invitation-id>/` prefix is still a live row.
 *
 * A key with no "/" sits at the bucket root and carries no invitation id, so it
 * is neither kept nor doomed — there is nothing to judge it by, and guessing
 * wrong deletes something a human put there on purpose.
 */
export function partitionOrphans(objects, liveIds) {
  const kept = []
  const doomed = []
  let doomedBytes = 0
  for (const o of objects) {
    const slash = o.key.indexOf('/')
    if (slash <= 0) continue
    if (liveIds.has(o.key.slice(0, slash))) {
      kept.push(o.key)
    } else {
      doomed.push(o.key)
      doomedBytes += o.size
    }
  }
  return { kept, doomed, doomedBytes }
}
