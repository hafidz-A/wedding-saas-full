# Media storage → Cloudflare R2 (design)

**Date:** 2026-08-02
**Status:** approved by the owner, not yet implemented
**Goal:** stop paying Supabase egress once per guest. Move invitation media (photos **and**
background audio) to Cloudflare R2, where egress is not billed at all, so delivery cost stops
scaling with guest count.

---

## Problem

Every wedding guest downloads the couple's photos from Supabase Storage, so one invitation with
300 guests costs roughly 300× the photo payload in Supabase egress. Measured/estimated at ~3.6 GB
per invitation against a **5 GB cached + 5 GB uncached** free-tier quota — roughly one active
wedding per month before the project is restricted.

The consequence of exceeding it is **not a bill** — the org is on the free plan with no payment
method, so Supabase applies Fair Use restrictions (pausing / 402 responses). The thing being
protected here is **uptime for a paying couple's invitation**, not cost.

Supabase's own CDN does not solve this: cached egress is metered too (separate quota, ~3× cheaper).
Confirmed in Supabase docs — *"Cached egress is egress that is served from our CDN via cache hits."*

R2 removes the multiplier structurally: **egress is free at any volume.** Cloudflare's free tier
gives 10 GB storage, 1M Class A (write) and 10M Class B (read) operations per month — roughly
1,250 invitations stored and ~1,650 invitations of guest traffic per month, versus ~1–3 today.

---

## Decisions (locked with the owner)

| Decision | Choice | Why |
|---|---|---|
| Where files live | **Cloudflare R2** | Egress free; also the only option Cloudflare's ToS explicitly permits — media hosted *outside* Cloudflare "will still be restricted on our CDN" |
| What stays on Supabase | **Everything else** — Postgres, Auth, RSVP, guests, payments, config | Only opaque blobs move; nothing that is queried or has RLS |
| Public hostname | `media.fincards.land` | The bucket holds audio too, so `foto.` would be wrong |
| Scope | **R2 migration only** | Responsive/two-size images explicitly dropped by the owner — current compression judged good enough |
| Rollback | **Render-time host rewrite**, not a DB rewrite | Stored URLs stay untouched; reverting is one env var, not a reverse migration |
| Who runs the app | **Vercel, unchanged** | `fincards.land` / `www` stay DNS-only (grey cloud). Vercel's own KB advises against proxying its sites through Cloudflare |

---

## Architecture

### Upload flow

The three-step shape is preserved exactly; only the destination changes. Bytes still never pass
through a Vercel function — that is what avoids Vercel's 4.5 MB request-body cap.

```
Browser → compress (unchanged) → POST /api/upload/sign → PUT direct to R2 → POST /api/upload/verify
```

| Step | Today | After |
|---|---|---|
| `/sign` | `supabase.storage.createSignedUploadUrl(path)` → `{path, token}` | S3 **presigned PUT URL** for the same path → `{path, url}` |
| client PUT | `supabase.uploadToSignedUrl(path, token, file)` | `fetch(url, { method: 'PUT', body: file, headers: { 'Content-Type': contentType } })` |
| `/verify` | `download()` whole object, sniff 32 bytes, `remove()` if bad | **Range GET** first 32 bytes, `DeleteObject` if bad |

The Range GET is a strict improvement: today `/verify` downloads the entire object into the
function just to read its first 32 bytes.

### Read flow — and the kill switch

Stored URLs in `invitations.config` are **never rewritten**. The swap happens at render time in
`fillEmptyImages(config)` (`src/app/[template]/[slug]/page.tsx:203`), which already walks the whole
config tree on every render and is therefore a free hook point.

```
stored in DB : https://<ref>.supabase.co/storage/v1/object/public/invitation-media/<id>/<file>
rendered as  : https://media.fincards.land/<id>/<file>
```

Rewrite is gated by `MEDIA_PUBLIC_HOST`. Unset → no rewrite, everything resolves to Supabase exactly
as today.

### Two independent rollbacks

1. **Legacy photos look wrong / R2 read path broken** → unset `MEDIA_PUBLIC_HOST`. Legacy URLs
   resolve to Supabase again, where the files still exist (originals are deliberately not deleted).
   Takes effect on next render; no data touched.
2. **R2 write path broken** → revert the code deploy. Uploads go back to Supabase Storage.

Note the honest limitation: after cutover, *newly* uploaded files exist only in R2, so rollback #1
does not help them — it restores legacy media only. Rollback #2 is the remedy for new uploads. This
is why the Supabase originals are kept until the owner is confident.

### DNS

```
fincards.land  →  Cloudflare nameservers
   ├── @, www      →  Vercel, "DNS only" (grey cloud)   ← site untouched, Vercel still serves it
   ├── send.*      →  Resend/SES records, copied exactly ← MUST NOT be missed
   └── media.*     →  R2 custom domain, "Proxied"        ← the only hostname on Cloudflare's edge
```

`send.fincards.land` currently holds `v=spf1 include:amazonses.com ~all`. Losing it breaks password
reset and payment notification email **silently** — the site stays up, so nobody notices. Cloudflare's
import scan is documented as "not guaranteed to find all" records, so this is verified by hand.

Set SSL/TLS mode to **Full (strict)** before proxying anything; this is a zone-wide setting on the
free plan and affects the Vercel-facing records too.

---

## Files

| File | Change |
|---|---|
| `src/lib/upload/r2.ts` | **Create.** S3 client + presign + range-get + delete + list-prefix. Server-only. |
| `src/lib/upload/media.ts` | **No new env-dependent helper.** Keep every existing constant and validator unchanged. |
| `src/app/api/upload/sign/route.ts` | Presign against R2; quota via `ListObjectsV2` prefix instead of `storage.list()`. |
| `src/app/api/upload/verify/route.ts` | Range-GET + delete against R2; return the `media.fincards.land` URL. |
| `src/editor/lib/uploadFile.ts` | Plain `fetch` PUT to the presigned URL instead of `uploadToSignedUrl`. |
| `src/lib/config/mediaHost.ts` | **Create.** Pure `rewriteMediaHost(url, host)` and `rewriteConfigMediaHosts(config, host)` — host passed **as an argument**, never read from `process.env` inside. |
| `src/app/[template]/[slug]/page.tsx` | Apply `rewriteConfigMediaHosts(config, process.env.MEDIA_PUBLIC_HOST)` immediately after the existing `fillEmptyImages(config)` call at line 203. |

**Two deliberate structural choices, so implementation does not have to guess:**

1. **The rewrite is a separate pass, not folded into `fillEmptyImages`.** That function's job is
   "supply placeholders for empty image fields"; host rewriting is a different concern and the name
   would stop describing the behaviour. A second walk over a config object is negligible, and each
   function stays independently testable.
2. **`rewriteMediaHost` takes the host as a parameter and never touches `process.env`.**
   `MEDIA_PUBLIC_HOST` is server-only (no `NEXT_PUBLIC_` prefix), so reading it inside a module that
   the client bundle can reach would silently evaluate to `undefined` rather than fail loudly. Only
   the server component reads the env var and passes it down. This also makes the function trivially
   unit-testable with no env stubbing.
| `scripts/migrate-media-to-r2.mjs` | **Create.** One-off copy of the 5 existing objects; idempotent; does not delete from Supabase. |

**Dependency:** `aws4fetch` (~4 KB, Cloudflare's recommended R2 signer). This is not a UI library, so
it does not conflict with the project's no-UI-library rule, but it is the only new dependency and
should be called out in review.

**Env:** `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`,
`MEDIA_PUBLIC_HOST`. All server-only — they must never appear in a `'use client'` file, consistent
with the existing secrets discipline.

---

## Error handling

- `/sign` quota check **fails open** today (logs and allows). Preserve that exactly — a failed
  `ListObjectsV2` must not block a legitimate upload.
- `/verify` remains authoritative: it sniffs real bytes, enforces the 5 MB / 12 MB ceilings on the
  stored object, and deletes on failure. R2 must not weaken this.
- The IDOR guard (`path.startsWith(owner.id + '/')` and no `..`) is load-bearing and carries over
  unchanged.
- `rewriteMediaHost` must be **total**: any URL that is not a Supabase Storage public URL for our
  bucket is returned untouched (Unsplash/picsum demo images, absolute non-media URLs, empty strings).

## Testing

- Unit: `rewriteMediaHost` — matching URL rewritten; foreign hosts, demo images, empty/null
  untouched; flag unset = identity.
- Unit: presigned-URL construction — correct bucket/key/expiry, no secret leaked into the returned
  URL beyond the signature.
- Existing `sign`/`verify` route tests must be updated, not deleted — they encode the ownership,
  IDOR, quota and magic-byte rules.
- Manual: upload a photo, upload an MP3, confirm both land in R2 and render; confirm a legacy
  Supabase-hosted photo still renders; flip `MEDIA_PUBLIC_HOST` off and confirm legacy reverts.

## Rollout order

Deliberately sequenced so no two risky changes are in flight at once, and so DNS is proven before
media depends on it.

1. **DNS to Cloudflare.** Verify site, `www`, and **email sending** still work. Media untouched.
2. **Create R2 bucket + `media.fincards.land` custom domain.** Copy the 5 existing objects. Verify a
   file is publicly fetchable. Nothing in the app uses it yet.
3. **Code change on a branch.** Tests green, deploy to a preview, upload end-to-end there.
4. **Set `MEDIA_PUBLIC_HOST` in production.** Watch.
5. **After a confidence period, delete the Supabase originals.** Not before.

Each step has a stop point. If a step misbehaves, stop and undo that step only.

---

## Out of scope

- Responsive / multi-size images (`srcset`). Dropped by the owner; the current compression is
  considered sufficient. Solary uses photos as three.js textures, which cannot use `srcset` — that
  complication is deferred with it.
- Long `cacheControl` on upload. Becomes far less relevant once R2 serves the bytes, but it is a
  one-line improvement worth folding into implementation if free.
- Migrating anything other than the media bucket.
- The legacy `/api/upload` proxy route (already tracked separately).

## Known risks

1. **Cloudflare ToS.** Cloudflare's blog states media hosted *outside* Cloudflare is restricted on
   their CDN; R2 is the explicitly permitted path, which is why this design uses it. The residual
   ambiguity is whether ~130 KB photos are "large files" at all — most likely not, and moot once the
   files are in R2.
2. **Nameserver propagation window.** Between switching nameservers and full propagation, resolvers
   may hold stale data. Do not delete the Vercel DNS zone during this window — it is the rollback.
3. **Apex IP is not a constant.** Vercel now issues project-specific anycast addresses; the value
   must be read from the Vercel dashboard at execution time, never hardcoded from documentation.
4. **New uploads are R2-only after cutover.** See the rollback limitation above.
