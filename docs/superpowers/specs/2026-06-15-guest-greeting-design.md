# Personalized guest greeting — design

**Date:** 2026-06-15
**Status:** Approved design, pending implementation plan
**Scope:** Both templates (lovebirds + solary) + the shared dashboard Guests tab WA blast.

---

## Goal

When an invited guest opens their personalized invitation link, the opening gate
greets them by name — **"Welcome, dear Ahmad"** — using the name the owner gave
the guest. Cosmetic and display-only; entirely separate from the single-use RSVP
token (which stays manual).

---

## Decisions (locked with the user)

1. **Name source:** the guest's existing `name` field. The owner controls the
   salutation by how they name the guest (e.g. typing "Pak Ahmad" or "Bapak & Ibu
   Budi" as the guest name). No new column, no migration, no second input.
2. **Wording:** **"Welcome, dear {name}"** on BOTH templates (solary's current
   "Dear {name}," is updated to match so the two templates are consistent).
3. **Delivery:** via a `?to=<Guest%20Name>` query param on the link the owner sends
   over WhatsApp. The card reads it client-side.
4. **Language:** the greeting lives on the card → English, humanized (per the
   user's rule that the template/kartu stays single-language; bilingual EN/ID is
   only for dashboard chrome).

---

## Data flow

```
Owner clicks "Send WA" for guest "Ahmad"
  → GuestsTab builds  …/<template>/<slug>?to=Ahmad
  → WA message {{url}} = that personalized link
Guest opens the link
  → opening gate reads ?to= (sanitized) → renders "Welcome, dear Ahmad"
No ?to= present → greeting line is hidden (no "Welcome, dear ,")
```

`?to=` is user-editable, which is harmless: it only changes the greeting the
opener sees, carries no authority, and is rendered as escaped text (no XSS). The
RSVP token is unaffected and still typed manually.

---

## Components

### 1. Owner side — `src/app/[template]/[slug]/dashboard/GuestsTab.tsx` (modify)
In `handleSend`, build a per-guest URL and pass it as the template `url` var:

```ts
const guestUrl =
  publicUrl + (publicUrl.includes('?') ? '&' : '?') + 'to=' + encodeURIComponent(g.name)
const message = renderMessageTemplate(source, {
  name: g.name,
  url: guestUrl,
  token: g.rsvpToken || '',
})
```

This makes `{{url}}` in the WA message a personalized link with zero card-side
owner effort, and lights up the greeting on **both** templates. Everything else in
`handleSend` (open WA tab, optimistic `sent_at`, `markGuestSent`) is unchanged.

The URL-builder logic (append `to` with the correct `?`/`&` separator + encoding)
is small and pure — extract it to a tiny tested helper, e.g.
`src/lib/guests/guestLink.ts` `buildGuestLink(publicUrl, name)`, so it can be unit
tested independently of the React component.

### 2. Solary card — `src/all-templates/solary/components/OpeningGate.jsx` (modify)
Already renders `{name && <p className="gate-greet">Dear {name},</p>}` via
`useGuest().name`. Change the wording to **`Welcome, dear {name}`**. No other change
— the `?to=` parse (`utils/guestName.js readGuestName`), sanitization, and
`GuestProvider` wiring already exist and stay as-is.

### 3. Lovebirds card — `src/all-templates/lovebirds/sections/Hero/Hero.jsx` (modify) + a new helper
Lovebirds has no guest-name plumbing. Add:
- `src/all-templates/lovebirds/utils/guestName.js` (new) — a `readGuestName()`
  mirroring solary's: read `?to=` from `window.location.search` (SSR-safe), strip
  `<>{}`, trim, cap at 80 chars, return `null` when absent/empty.
- In `Hero.jsx`, compute the name once (client-side) and render
  **`Welcome, dear {name}`** on the opening gate card, styled to fit the existing
  gate typography (add a `.gateGreet` class to `Hero.module.css`).

Keep lovebirds' helper template-local (templates are intentionally independent —
don't cross-import solary's util).

### 4. Fallback & preview (both templates)
- **No `?to=`:** the greeting line is hidden (`name && …`). No empty/awkward render.
- **Editor preview (`?preview=1` and no `?to=`):** show a sample
  **"Welcome, dear [Guest name]"** so the owner sees the greeting placement while
  designing. Live + no param = still hidden. (Solary already exposes
  `useGuest().preview`; lovebirds reads `?preview=1` the same way the Rsvp form
  already does.)

---

## Error handling / edge cases

- Missing/empty `?to=` → `readGuestName` returns `null` → greeting hidden.
- Hostile input (`<script>`, very long string, braces) → stripped of `<>{}`,
  capped at 80 chars; React escapes the text node regardless.
- Names with `%`, spaces, `&` → `encodeURIComponent` on the owner side; the card's
  `URLSearchParams.get('to')` decodes once (solary's helper already documents the
  "don't double-decode" gotcha — lovebirds' mirror must follow it).
- `publicUrl` that already contains a query string → builder uses `&`.

---

## Testing

- `buildGuestLink(publicUrl, name)` unit tests: appends `?to=` on a bare URL, `&to=`
  when a query already exists, encodes spaces ("Pak Ahmad" → `Pak%20Ahmad`) and
  `&`/`%`, handles empty name.
- lovebirds `readGuestName()` unit tests: parses `?to=`, strips `<>{}`, caps length,
  returns `null` when absent (mirror solary's existing behavior; jsdom for
  `window.location`).
- Card render: small JSX additions verified by `npx tsc --noEmit` and the existing
  demo/E2E flow. Verify with `npx vitest run` (suite stays green) — repo lint
  hangs, don't use it.

---

## Out of scope (YAGNI)

- A separate salutation/greeting column (decided: reuse `name`).
- Automatic honorifics ("Pak"/"Ibu" inference).
- Bilingual greeting (card stays English).
- Carrying the RSVP token in the link (token stays manual by earlier decision).
- A "copy personalized link" button (only the WA blast path is in scope; revisit
  if the dashboard later needs a copyable per-guest link).
