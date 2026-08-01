# TEST-MATRIX — wedding-saas-next

> Kontrak cakupan untuk suite automated test lengkap. Setiap sel relevan WAJIB
> punya ≥1 test **bermakna** yang jalan (bukan tautologi). Tidak ada sel yang
> boleh ditandai N/A tanpa alasan tertulis di kolom Catatan.
>
> Dihasilkan Fase 0 dari inventory nyata (bukan tebakan). Diperbarui tiap fase.

## Status legend
- ❌ belum ada test
- 🟡 sebagian (ada test tapi tak menutup happy + error + boundary)
- ✅ tertutup + hijau dari checkout bersih
- 🐛 test ada & mengungkap bug nyata → lihat `BUG-LEDGER.md`

## Layer
| Kode | Layer | Tool |
|---|---|---|
| L0 | Static / type | `npx tsc --noEmit`, dict-parity (vitest) |
| L1 | Unit (pure fn) | vitest, `src/**/__tests__/` |
| L2 | Integrasi (server action + API route) | vitest + Supabase test-double |
| L3 | E2E (perjalanan user) | Playwright, `e2e/` |
| L4 | Visual regression | Playwright `toHaveScreenshot` |
| L5 | A11y | `@axe-core/playwright` |
| L6 | Perf | Lighthouse / Chrome DevTools MCP + FPS trace |
| L7 | Security | vitest + Playwright + cek DB row |

---

## L0 — Static / type
| Item | Status | Catatan |
|---|---|---|
| `tsc --noEmit` bersih | ✅ | Fase 1: verified exit 0; gate di `test:all` |
| dict-parity id/en | ✅ | `src/lib/i18n/__tests__/dict-parity.test.ts` |
| tutorial-copy parity (lovebirds+solary) | ✅ | sudah ada 3 test i18n |
| tutorial-structure | ✅ | ada |
| no `@ts-ignore`/`as any` baru | ❌ | guard grep-based — ditunda ke Fase 8 |

## L1 — Unit (pure functions)
| Modul | Status | Catatan |
|---|---|---|
| lib/payments (plans, active-period, xendit-token) | ✅ | 3 test |
| lib/guests (crypto, parse-import, phone, whatsapp) | ✅ | 4 test |
| lib/guestbook (category, csvRows, printHtml, stats) | ✅ | 4 test |
| lib/crypto (config) | ✅ | ada |
| lib/csv (buildCsv) | ✅ | ada |
| lib/config (fillEmptyImages, migrate, palette-allowlist) | ✅ | 3 test |
| lib/checkin (match) | ✅ | ada |
| lib/auth (idle-timeout, **passwordPolicy**, **safeNext**) | ✅ | Fase 1: +18 test |
| lib/nav (is-cinematic-route) | ✅ | ada |
| lib/i18n | ✅ | dict-parity dkk |
| lib/safeUrl | ✅ | `src/lib/__tests__/safeUrl.test.ts` |
| demoImages, format-thousands | ✅ | ada |
| lib/brand | ✅ | Fase 1 |
| lib/security/timing (timingSafeStrEqual) | ✅ | Fase 1 |
| lib/security/rate-limit (getClientIp) | 🟡 | Fase 1: getClientIp ✅; `rateLimit`/`enforceRateLimit` = L2 |
| lib/legal/consent | ✅ | Fase 1 |
| lib/onboarding/seed-config (validateSlug, buildSeedConfig) | ✅ | Fase 1: 10 test |
| lib/auth/passwordPolicy | ✅ | Fase 1: 11 test (min8+upper+angka+simbol) |
| lib/auth/pwnedPassword (HIBP k-anon) | ❌ | network → L2 (mock fetch) |
| solary normalizeConfig | ✅ | ada |
| editor reducer / max-items / templatePolicy / schema-registry | ✅ | 5 test |
| templatePolicy: mandatoryTypes dihapus (RSVP/Gift jadi section biasa); saturn tetap position+type locked tapi bisa di-on/off | ✅ | templatePolicy.test.ts + template-policy.test.ts, 44 test |
| solary normalizeConfig: saturnRing nonaktif tetap MEMESAN planet Saturn (journey lompat uranus → jupiter, bukan digeser) | ✅ | normalizeConfig.test.js |
| needsDisableConfirm (persis 4 tipe: rsvp/weddingGift/rsvpPlanet/giftPlanet) + reducer `TOGGLE_SECTION_ENABLED` (enabled:undefined → false, bukan no-op) | ✅ | templatePolicy.test.ts + editor-reducer.test.ts |
| lovebirds GalleryMasonry distribute | ✅ | ada |

## L2 — Integrasi (server actions + API routes) — test-double `src/__test-stubs__/supabaseFake.ts`
**Server actions (3):**
| Action | Status | Cakupan (Fase 2) |
|---|---|---|
| `onboarding/actions.ts` | ✅ | completeOnboarding (auth, slug, anti-abuse draft cap, unpaid-draft insert), checkSlugAvailable, startCheckout, recheckPayment — 14 test |
| `dashboard/guestbook/actions.ts` | ✅ | search walk-in (decrypt+mask), addWalkIn (cross-tenant, duplicate 23505), addUnlisted (guest_id null+enkripsi), deleteAttendance (IDOR), ensureCheckinToken |
| `dashboard/guests/actions.ts` | ✅ | addGuest (auth/empty/enkripsi), update+delete (IDOR scope), importGuests (DoS guard), updateInviteMessageTemplate (owner) |

**API routes (14 done + 1 icon deferred):**
| Route | Method | Status | Cakupan |
|---|---|---|---|
| /api/auth/logout | POST | ✅ | JSON vs 303 redirect, signOut |
| /api/checkin/search | POST | ✅ | rate-limit, **token-gate (no token=no names)**, decrypt+match guest/rsvp |
| /api/checkin/confirm | POST | ✅ | rate-limit, token 403, mark-arrived insert/update, **cross-tenant 404** |
| /api/rsvp | POST | ✅ | validasi, 404/403 gate, **enkripsi PII**, attendance auto-pop, clamp, 500, 429 |
| /api/gift | POST | ✅ | validasi, **normalisasi Rp "500.000"→500000**, enkripsi, account plaintext, 429 |
| /api/guestbook | POST | ✅ | rate-limit (rpc + in-memory 30s), len validasi, color allowlist, enkripsi |
| /api/guestbook/[id] | DELETE | ✅ | auth, **cross-tenant 403**, 404, delete |
| /api/invitation/[slug]/config | PUT | ✅ | auth, 413 DoS, **409 optimistic-concurrency**, PRESERVE_KEYS merge |
| /api/invitation/[slug]/meta | PUT | ✅ | auth, ogImage http-guard, whitespace-normalize, clear |
| /api/invitation/[slug]/music | PUT | ✅ | auth, null-clears, sanitize defaults, 500 |
| /api/invitation/[slug]/theme | PUT | ✅ | auth, ornament allowlist, palette allowlist, save |
| /api/invitation/[slug]/publish | POST | ✅ | auth (no DB touch), boolean validasi, flip, 500 |
| /api/payment/xendit/webhook | POST | ✅ | **token 401**, non-PAID ack, idempoten, **amount-verify publish/reject** |
| /api/upload | POST | ✅ | rate-limit, mime allowlist, **magic-byte guard**, **quota 413**, auth |
| /[template]/[slug]/icon | GET | ❌ | render icon — DEFERRED (image-gen, low risk) |

## L3 — E2E (Playwright) — KEDUA template
**Auth/akun:** (Fase 3 — `e2e/auth.spec.ts` + `e2e/auth-recovery.spec.ts`, 14 test, semua intercept)
| Flow | Status | Catatan |
|---|---|---|
| signup + password checklist live | ✅ | render, checklist ✓/○, consent-gate, mismatch, signup→verify (intercept) |
| verify-signup (OTP) | ✅ | email prefill, strip non-digit + cap 6, wrong-code 403 |
| login | ✅ | render, bad-creds 400 intercept, link signup/forgot |
| forgot → reset password | ✅ | recover intercept→continue-token, reset checklist + field render |
| logout | 🟡 | route diuji L2 (2 test); E2E butuh sesi → Fase 5 |
| profile edit | ❌ | butuh sesi auth → Fase 5 |
| onboarding wizard | ❌ | server-action diuji L2; E2E wizard butuh sesi → Fase 5 |

**Undangan publik (lovebirds & solary):** (Fase 4 — `e2e/invitation.spec.ts`, slug `demo-*` = render bundled config, submit simulated, nol tulisan prod)
| Flow | Status | Catatan |
|---|---|---|
| render tanpa crash (pageerror) | ✅ | lovebirds shell sinematik + **solary canvas 3D boot** |
| RSVP submit | ✅ | lovebirds simulated-success + **verified NO POST** |
| Gift confirmation submit | 🟡 | lovebirds = display rekening (bukan form); solary gift = display |
| Guestbook submit | ❌ | lovebirds guestbook di-strip (migrate); solary dalam 3D scroll → susul |
| opening/password gate | ❌ | susul |
| musik play/mute · gallery cap 30 · theme/palette | ❌ | susul (sebagian = L7/visual) |

**Dashboard editor:** (Fase 5 — `e2e/dashboard.spec.ts`, READ-ONLY: login dummy + nol mutasi)
| Flow | Status | Catatan |
|---|---|---|
| login gate per-slug | ✅ | gate render + wrong-pass tolak (intercept) + **owner login dummy → DashboardClient** |
| edit field → save → reload persist | 🟡 | save = config PUT route (L2 ✅); E2E mutasi di-skip (read-only) |
| publish toggle | 🟡 | publish route L2 ✅; E2E read-only |
| upload image + quota | 🟡 | upload route L2 ✅ (magic-byte+413); E2E read-only |
| aturan lock/swap section (templatePolicy) | ✅ | unit L1 (templatePolicy.test.ts + template-policy.test.ts, 44 test); on/off terkunci hanya di opening+footer (lovebirds hero/footer, solary intro/sun) — mandatoryTypes sudah dihapus; solary saturn tetap terkunci posisi+tipe tapi bisa di-on/off |
| RSVP list / gifts / guestbook view | 🟡 | dashboard render setelah login (read-only); tab-spesifik bisa disusul |
| guestbook v2 / tutorial tab | 🟡 | logika di L1/L2; E2E render read-only |

## L4 — Visual regression — `e2e/visual.spec.ts` (Fase 9)
| Target | Status | Catatan |
|---|---|---|
| login, signup, forgot-password | ✅ | baseline `toHaveScreenshot`, reduced-motion, cocok back-to-back |
| Undangan lovebirds/solary, dashboard | ❌ | SENGAJA dikecualikan: animasi/3D/demo-image acak → pixel-diff flaky; ditutup crash-smoke+a11y |

## L5 — A11y (axe) — `e2e/a11y.spec.ts` (Fase 7)
| Halaman | Status | Catatan |
|---|---|---|
| login, signup, forgot, reset, verify | ✅ | scoped `<main>`, nol critical+serious |
| Undangan lovebirds + solary | ✅ | nol critical (serious kontras = design, non-blocking) |
| **Temuan: LangToggle color-contrast (serious)** | 🐛 | BUG-LEDGER — fix menunggu user |
| Landing, profile, onboarding, dashboard | ❌ | susul (dashboard gate prod-dependent, dipindah ke dashboard.spec) |

## L6 — Perf — `e2e/perf.spec.ts` (Fase 9)
| Metrik | Status | Catatan |
|---|---|---|
| FPS solary 3D scene (tak beku) | ✅ | rAF ≥ 20fps; desktop ~60–90 |
| FPS lovebirds (tak beku) | ✅ | rAF ≈ 91fps |
| Lighthouse skor landing/undangan | ❌ | DITUNDA — butuh prod-build (`next build`); dev-mode tak representatif. Bisa via Chrome DevTools MCP `lighthouse_audit` |
| FPS mobile + CPU throttle | ❌ | susul (device+CDP throttle emulation) |

## L7 — Security
| Kontrol | Status | Catatan |
|---|---|---|
| Isolasi tenant: sesi A tak bisa akses dashboard B | ✅ | **E2E** `security.spec.ts` (lovebirds→solary = wrong-account) + IDOR L2 |
| Dashboard tanpa sesi → login gate | ✅ | `dashboard.spec.ts` |
| PII terenkripsi (payload insert = ciphertext) | ✅ | L2 (rsvp/gift/guestbook/attendance/guests) |
| Token compare timing-safe | ✅ | L1 `timing.test.ts` |
| XSS guard safeUrl / open-redirect safeNext | ✅ | L1 |
| Guestbook rate-limit per-IP | ✅ | L2 (rpc + in-memory 30s) |
| Webhook token + verifikasi nominal | ✅ | L2 webhook |
| RLS: anon tak bisa baca tabel PII | ✅ | **`scripts/verify-encryption-at-rest.mjs`** — anon SELECT guests/rsvps/gift/attendances = 0 baris (DB nyata) |
| PII ciphertext di BARIS DB sungguhan | ✅ | script di atas — name_enc AES-GCM reversibel dgn domain key, ≠ plaintext (data dummy) |
| Kebocoran metadata (S-3) | ❌ | susul |

---

## Open Decisions (perlu keputusan user sebelum fase destruktif)

**#1 — Backend untuk E2E destruktif.** Akun dummy hidup di **Supabase produksi**
(via `.env.local`). E2E yang submit RSVP/gift/guestbook/upload akan **menulis row
ke prod**. Pilihan:
- (a) **Network interception** Playwright — stub respons API destruktif, uji UI saja
  (cepat, nol polusi prod, tapi tak menguji jalur DB sungguhan).
- (b) **Supabase lokal** via `supabase start` + skema test (isolasi penuh, setup berat).
- (c) **Project Supabase test terpisah** (.env.test) — bersih, perlu provisioning.
- (d) Izinkan tulis ke prod tapi **auto-cleanup** row test (berisiko).

Rekomendasi: **(a)** untuk L3 UI + **(b/c)** untuk L2 jalur-DB. Tunggu keputusan
sebelum Fase 4.

**#2 — Mode A (report-only) atau B (fix-as-you-go)?** Default A sampai diubah.
