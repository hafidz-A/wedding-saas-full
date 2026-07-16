# TEST-REPORT — wedding-saas-next

Laporan suite automated test. Cakupan sel-per-sel: lihat `TEST-MATRIX.md`. Temuan: `BUG-LEDGER.md`.

## Run design-system hardening (2026-07-17)
- **Konteks:** eksekusi plan `docs/superpowers/plans/2026-07-16-design-system-hardening.md` (13 task + final-review fix wave; commits `4d7658e..b29ceb1`). Lapisan `src/components/ui/` baru (Button, DialogProvider terpadu, useEscapeToClose), migrasi admin/profile, token `--status-danger*`/`--z-dialog`, guard token kini memindai inline style `.tsx/.jsx/.ts`.
- **Gates di head:** tsc bersih · vitest **649 test / 95 file HIJAU** (593 → 649: +26 test komponen ui via jsdom/@testing-library + +11 test `scripts/lib/token-rules` + suite receipt email) · `npm run check:tokens` → `✓ design tokens clean (radius + control heights, css + inline tsx)`.
- **Infra test baru:** jsdom + @testing-library/react (file `.test.tsx` opt-in via docblock `@vitest-environment jsdom`; CSS modules `classNameStrategy: 'non-scoped'`).
- **Playwright:** tidak dijalankan pada wave ini (perubahan UI-layer; smoke visual manual disarankan sebelum merge — lihat catatan restyle dialog dashboard di ledger).

## Run verifikasi migrasi Midtrans (2026-07-15)
- **Konteks:** verifikasi penuh pasca migrasi Xendit → Midtrans Snap (spec/plan 2026-07-14; commits `e787eda..a3c501e`).
- **`npm run test:all`** → **exit 0**: tsc bersih · vitest **593 test / 89 file HIJAU** · Playwright **82 passed, 1 flaky (a11y login — lolos retry), 6 skipped** (1.1 jam, 3 viewport).
- **`npm run verify:security`** → semua check at-rest + RLS HIJAU (termasuk destinasi refund terenkripsi).
- **`node scripts/diag-midtrans.mjs`** → key LIVE valid terhadap `api.midtrans.com` (200); akun production AKTIF. E2E sandbox (QRIS + VA + refund drill) menunggu key `SB-Mid-server-…` + deploy preview (webhook butuh URL publik) — checklist di plan Task 8.
- **Cakupan baru:** 16 test gateway (signature/order-id/channel) + 11 test webhook Midtrans menggantikan test Xendit lama.

## Ringkasan eksekutif (2026-06-14)
- **Mode:** B (fix-as-you-go) · **Backend test:** mock + intercept (E2E undangan/auth nol sentuhan prod; dashboard = login dummy read-only atas izin user)
- **vitest** `npx vitest run` → **344 test / 57 file — HIJAU**
- **Playwright** `npx playwright test --project=desktop` → **36 test — HIJAU, deterministik** (smoke 2 · auth 7 · recovery 7 · undangan 3 · dashboard 3 · a11y 8 · security 1 · visual 3 · perf 2); full-run serial 1.1m, hijau back-to-back.
- **DB nyata** `node scripts/verify-encryption-at-rest.mjs` → **9 check HIJAU** (PII at-rest AES-GCM reversibel + RLS anon = 0 baris)
- **tsc** `npx tsc --noEmit` → **bersih (exit 0)**
- **Total: 380 test/check otomatis, semua hijau.**
- **Bug produk:** 1 ditemukan (a11y LangToggle) → **FIXED + regression-guarded**.
- **Catatan suite:** `workers: 1` (serial) wajib — paralel membuat satu `next dev` choke (lihat ledger). Pre-warm dev server lalu `reuseExistingServer` paling andal.
- **Temuan:** 1 bug produk (a11y kontras LangToggle, serious) — DICATAT, fix menunggu user (design CSS). Lihat `BUG-LEDGER.md`.

## Reproduksi
```bash
npm run typecheck     # tsc --noEmit
npm run test:unit     # vitest (L0 dict-parity + L1 unit + L2 integrasi) — 344
npm run test:e2e      # playwright (L3+a11y+security) — dev server auto-start
npm run test:all      # ketiganya berurutan
# E2E satu viewport (cepat): npx playwright test --project=desktop
```

## Progres per fase
| Fase | Layer | Status | Bukti |
|---|---|---|---|
| 0 | Harness + inventory | ✅ | `playwright.config.ts`, smoke 2 hijau, `TEST-MATRIX.md` |
| 1 | L0 static + L1 unit | ✅ | tsc bersih; +43 test (7 modul tadinya nol coverage) |
| 2 | L2 integrasi | ✅ | 14/14 route + 3/3 action; +115 test; `supabaseFake.ts` |
| 3 | L3 E2E auth | ✅ | 14 test (login/signup/forgot/verify/reset) — intercept |
| 4 | L3 E2E undangan | ✅ | render kedua template + RSVP simulated (demo slug) |
| 5 | L3 E2E dashboard | ✅ | gate + wrong-pass + owner-login dummy (read-only) |
| 6 | L7 security E2E | ✅(sebagian) | tenant-isolation E2E + (L2: token-gate, IDOR, enkripsi, amount-verify) |
| 7 | L5 a11y | ✅ | axe 7 halaman offline; 1 finding (LangToggle) tercatat |
| 7 | L4 visual + L6 perf | ⏳ | DITUNDA — lihat self-audit |
| 8 | Konsolidasi + self-audit | ✅ | gate gabungan hijau; dokumen ini |

## Keamanan tertutup test nyata
- **PII terenkripsi at-rest** pada insert (rsvp/gift/guestbook/attendance/guests) — assert ciphertext ≠ plaintext (L2).
- **Isolasi tenant**: E2E (sesi A tak bisa buka dashboard B → wrong-account) + IDOR scope `.eq(invitation_id)` (L2).
- **Token-gate check-in**: token salah → 0 nama bocor (L2).
- **Webhook Xendit**: token 401 + verifikasi nominal sebelum publish + idempoten (L2).
- **Upload**: magic-byte signature + mime allowlist + kuota 300MB→413 (L2).
- **Auth gate dashboard**: tanpa sesi → login form; wrong-pass ditolak; owner → dashboard (L3).
- **Open-redirect** safeNext + **timing-safe** token compare (L1).

## Self-audit (kejujuran cakupan — nol skip tersembunyi)
**Tertutup & hijau:** L0 (tsc, dict-parity) · L1 (semua pure-fn termasuk 7 yang tadinya nol) ·
L2 (14/14 route + 3/3 action) · L3 (auth 14, undangan 3, dashboard 3) · **L4 visual (3 baseline)** ·
L5 a11y (form 5 + LangToggle guard + undangan 2) · **L6 perf FPS (solary ~147, lovebirds ~84)** ·
L7 (isolasi tenant E2E + **PII at-rest & RLS terhadap DB nyata** via `scripts/verify-encryption-at-rest.mjs`).

**1 bug produk DITEMUKAN → ✅ FIXED:** LangToggle kontras AA (pill → #C7402B = 5.0:1),
regression-guarded. Lihat `BUG-LEDGER.md`.

**Sisa yang SENGAJA DITUNDA (beralasan, bukan di-skip diam-diam):**
1. **Lighthouse skor** — butuh prod-build (`next build`); dev-mode tak representatif. FPS sudah ditutup; skor formal via Chrome DevTools MCP `lighthouse_audit` saat ada prod build.
2. **FPS mobile + CPU throttle** — kasus yang dulu bermasalah; perlu device+CDP emulation.
3. **Mutasi dashboard E2E** (save/publish/upload/delete via UI) — sengaja read-only (keputusan user); jalur penuh di L2.
4. **Visual regression template/3D** — non-deterministik (animasi/canvas/demo-image acak); ditutup crash-smoke+a11y.
5. **Route `[template]/[slug]/icon`** (image-gen) · **kebocoran metadata S-3** · **guard "no `@ts-ignore`"** — risiko rendah / opsional.

**Nol `.skip`/`.only`/`xfail` tersembunyi.** Determinisme: full E2E 36/36 hijau back-to-back; RSVP 5/5 (toPass). Flakiness yang ditemukan (workers, hydrasi, webServer timeout) semua di-root-cause + fix, tercatat di ledger.
