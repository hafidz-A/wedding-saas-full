# Solaary — Master Visual Foundation (v2 · grounded "starlit romance")

> Phase 2 foundation, **revised** after the visual-direction review.
> Direction decision: **soften the cosmic theme to "starlit romance."** Keep the template's
> evening/under-the-stars *mood* and engine, but the visual world is now a **timeless,
> warm, real-world luxury wedding** — fine-art editorial, romantic garden & destination,
> European editorial restraint. **No galaxies, planets, nebulae, cosmic dust, space
> environments, or fantasy-universe aesthetics.** A real night sky / candlelight / golden
> hour is welcome (that's earthly romance); outer-space abstraction is not.
> Built only from what exists in the template. No new milestones. Supersedes v1.

**Couple:** Aruna (bride) & Daksa (groom) — Indonesian.
**World:** timeless romantic wedding — real places, beautifully lit; an elegant evening-and-stars *accent*, never sci-fi.
**Arc (fixed, from config):** 2019 meet (Bandung) → 2021 long-distance ("Gravity") → 2023 same city, coffee mornings ("Aligned") → 2025 proposal (Mt Bromo, starlit night) → 2027 wedding (Plataran Menteng, Jakarta, 02·14·2027).
**Hard constraint:** illustrations must read on **8 runtime palettes** (4 moody-evening + 4 light-airy) the live switcher applies.

---

## A. MASTER CHARACTER BIBLE

The couple recurs across the template (gate, welcome, story, gallery, footer). They must be the **same two people**, aging subtly across 8 years — rendered as warm, real Indonesian people.

### Aruna — the bride (recurring)

| Trait | Locked definition |
|---|---|
| Identity | Indonesian woman; warm, grounded, quietly radiant |
| Age across arc | ~23 (2019) → ~31 (2027); same person, gently matured |
| **Skin** | Warm **light-to-medium** Indonesian complexion, healthy natural glow, warm-neutral (soft honey-beige) undertones; luminous, elegant-bridal — **never** whitened |
| Hair | Dark brown / near-black, long, softly wavy; half-up everyday, elegant low updo for proposal & wedding |
| Face | Soft oval, warm dark-brown eyes, gentle full brows, natural warm smile |
| **Consistency anchors** | Small beauty mark high on the left cheek; delicate gold stud / thin ear-cuff; a fine pendant *(now a simple gold/locket pendant — not a "star charm")* |
| Build / posture | Petite-to-average, graceful; a head shorter than Daksa |
| Wardrobe logic | Warm-romantic: dusty rose, plum, cream, soft gold. Ivory/soft-gold gown at wedding |

### Daksa — the groom (recurring)

| Trait | Locked definition |
|---|---|
| Identity | Indonesian man; warm, easygoing, steady |
| Age across arc | ~25 (2019) → ~33 (2027); same person, gently matured |
| **Skin** | Natural warm **tan** Indonesian complexion, healthy and realistic, slightly deeper than Aruna's; relatable, never muddy |
| Hair | Black, short, neat, slight texture; consistent light stubble |
| Face | Soft-angular jaw, warm dark eyes, defined brows, easy grin |
| **Consistency anchors** | Light stubble (always); simple matte watch on left wrist; a refined lapel detail at formal moments |
| Build / posture | Average-tall, relaxed broad shoulders; a head taller than Aruna |
| Wardrobe logic | Deep neutrals: charcoal, deep indigo, warm taupe. Wedding = elegant dark formal / classic black tie |

### Skin-tone & lighting rule (replaces v1's "fixed, never recolored")
- Each character keeps a **consistent skin *hue family*** for identity — but brightness and warmth **respond naturally to the light** of each scene: sunlight, shade, indoor, golden hour, venue lighting.
- **Do not force identical skin brightness in every image.** A café-window morning, a sunset hillside, and a candlelit reception should each light the same skin differently.
- Bride reads a touch brighter/luminous; groom a touch deeper/tan — a natural couple, not two copies of one tone.

### Physical & visual consistency
- Lock: face geometry, hue family, hair shape/color, signature marks, eye color, relative height (Daksa ≈ one head taller). Proportion ≈ **6.5–7 heads** (mature, not chibi).
- Aging via subtle cues only — never a different face or build.
- Same rendering treatment, line weight, proportion, and per-character wardrobe logic every time.

---

## B. VISUAL STYLE BIBLE

### Illustration style
Premium **editorial romance illustration** — "cartoonized but mature." Semi-realistic, fine-art wedding feel. Contemporary vector-painterly hybrid.
- **Not** 3D/Pixar, **not** flat Memphis, **not** anime, **not** childish, **not** sci-fi.
- References: luxury wedding editorial, fine-art wedding photography, premium wedding stationery, romantic garden & destination weddings, European editorial, warm natural storytelling.

### Rendering style
- Flat base + **soft volumetric gradient shading** (gentle form light).
- **Real environmental light** is the mood-setter — window light, golden hour, candlelight, overcast garden softness, string-light warmth. (This *replaces* v1's "cosmic rim-light.")
- Warm subsurface skin; fine, tasteful film grain for a premium tactile finish. Never plastic, never CGI.

### Line style
- Clean, confident **medium-weight contour**; minimal interior line; tapered where natural.
- Line color is a **deep warm neutral** (deep espresso / plum-brown), **not pure black**. A slightly heavier even contour is allowed in the light/neo-brutalist palettes to harmonize with the UI's chunky borders.

### Color palette (renamed to wedding language — values kept, neon glow dropped)

Moody-evening (formerly "dark cosmic"; soft editorial light, **no nebula glow**):

| Key (unchanged) | New name | BG | Accent |
|---|---|---|---|
| `cosmicDark` | **Plum Twilight** | `#06061a` | `#c19bff` |
| `nebulaDark` | **Golden Hour Noir** | `#0d0a07` | `#e8b86a` |
| `roseDark` | **Rosewood** | `#100608` | `#f08aa6` |
| `emeraldDark` | **Emerald Velvet** | `#04100b` | `#7be0a9` |

Light-airy (warm, premium, **default lives here**):

| Key (unchanged) | New name | BG | Accent |
|---|---|---|---|
| `lavenderLight` | **Lavender Haze** | `#e5dbf0` | `#7D53DE` |
| `sunburstLight` | **Golden Champagne** *(new default)* | `#eedfc8` | `#d97706` |
| `roseLight` | **Blush** | `#ead5d8` | `#e64980` |
| `botanicalLight` | **Sage Garden** | `#dceae0` | `#0f9f8e` |

**Two-layer color rule (revised):**
1. **Character anchor layer (FIXED hue, naturally lit):** skin hue family, hair, eyes, core wardrobe — consistent identity, lit by the scene.
2. **Atmosphere layer = the memory's REAL environment** (café warmth, garden green, golden sky, candlelight) — *not* a section-accent glow. The active palette tints the *UI chrome* (cards, type, borders); it should not paint sci-fi auras onto the people.

### Composition style
- Couple is the **subject and clearly present**, faces readable.
- Premium imagery ratio: **~20–40% couple / ~60–80% atmospheric real environment** (breathing room, fine-art negative space) — replacing v1's "cosmic space."
- Favor **3/4 angles + genuine interaction** over flat front-facing.
- Respect each container's crop (E5).

### Wedding-invitation style
Romantic, elegant, **timeless, warm, human, premium**. Indonesian wedding warmth + European editorial restraint. Harmonizes with the UI (glass cards in evening palettes, neo-brutalist polaroid framing in light palettes). Cohesion via art direction, not repetition.

---

## C. STORYTELLING BIBLE

### Emotional continuity
`spark / curiosity` → `longing` → `comfort / settledness` → `peak joy (the "yes")` → `union & gratitude`. Each image lands its beat and feels continuous with the last.

### Narrative continuity (5 fixed milestones — unchanged)
1. **2019 · First Orbit** — Aruna & Daksa *meet* at a friend's birthday in Bandung.
2. **2021 · Gravity** — a long-distance year that pulls them *closer, not apart*.
3. **2023 · Aligned** — same city; *coffee mornings become routine*.
4. **2025 · The Proposal** — Mt Bromo, a **real starlit night** (a natural meteor shower is fine — it's the sky, not sci-fi); she says yes.
5. **2027 · The Wedding** — the invitation itself (Plataran Menteng garden pavilion).
Recurring motif: warmth, light, and closeness between the two — a *lovers-under-the-stars* romance read literally (real night sky), not a galaxy.

### Memory-driven storytelling
- Gallery = **"eras of us"**: every frame shows the couple *living* the captioned moment in its real place — never an object/empty venue.
- Gate & footer frames = a recurring **refrain of the couple** in real settings.

### Human-interaction requirements
Always two people **relating** — never posed apart at camera. Per beat: first glance (meet) · reaching across distance / video-call glow (long-distance) · shared quiet over coffee (aligned) · kneel + genuine emotional reaction under a starlit sky (proposal) · vows / embrace (wedding).

---

## D. ILLUSTRATION RULES (enforced on every image)

| Mandate | DO | DON'T |
|---|---|---|
| Cartoonized but mature | adult ≈6.5–7 heads, refined features | chibi / big-head / childish |
| Emotionally authentic | micro-expression matched to the beat | blank identical smiles |
| Premium wedding quality | cohesive palette, fine-art finish | clip-art, cheap gradients, clutter |
| Natural body language | weight shift, asymmetry, leaning-in | stiff symmetry, arms glued down |
| Natural gestures | hands *doing something*, **correct hands** | malformed/floating/hidden hands |
| Living characters | candid, implied motion, environment interaction | frozen, staged, lifeless |
| Not stock-photo posing | 3/4 angles, real interaction | both front-facing, smiling at camera |
| Not mannequin-like | warm skin, asymmetry, lived-in fabric | plastic doll faces, perfectly pressed |
| **Grounded world** | real café/garden/mountain/home/venue light | galaxies, planets, nebulae, cosmic dust, floating-in-space, fantasy universe |
| **Natural skin** | healthy glow, lighting-responsive, true Indonesian tones | overly dark, muddy, washed-out, whitened, beauty-filter, plastic/CGI |

**Always:** couple present & recognizable · emotion legible without text · a stranger understands the milestone from the picture alone. **Never:** symbolic-object-only frames, faceless silhouettes as the story carrier, a different-looking couple between frames, or any outer-space/fantasy backdrop.

---

## E. CONSISTENCY RULES

1. **Character lock sheet** — Aruna: light-to-medium warm glowing skin · long dark wavy hair · left-cheek beauty mark · gold stud · fine pendant · rose/plum/cream wardrobe. Daksa: warm tan skin (slightly deeper) · short black hair + light stubble · matte watch · charcoal/indigo/taupe wardrobe. Daksa ≈ one head taller; ≈6.5–7 heads.
2. **Asset reuse map** — same couple in: gate ×3 (twinkle + footer), welcome portrait, all 5 story frames, couple gallery frames. Party avatars ×6 = separate supporting individuals. (Planet textures + scene = pending the engine softening; not couple assets.)
3. **Skin-hue-consistent, light-responsive** — fixed hue family per character; brightness/warmth adapt to each scene's real light; never uniform brightness, never muddy/whitened.
4. **Grounded-environment rule** — each image's atmosphere is its real-world setting; the palette tints only UI chrome, never sci-fi auras on people.
5. **Aging rule** — one continuous timeline 2019→2027, subtle cues only.
6. **Container / crop consistency** — twinkle (square thumb), footer (3:4 portrait), welcome (4:5), story (polaroid ~square/4:5), gallery (3:2 landscape), party (1:1).
7. **Acceptance checklist** — reject unless: unmistakably the couple · right ages · emotion matches · couple present & interacting · hands correct · natural lighting-responsive skin · **no cosmic/fantasy backdrop** · survives all 8 palettes · crop fits container · premium, not stock/mannequin.
8. **Reference discipline** — build a master character reference sheet first; carry its seed/reference into every later generation so identity never drifts.

---

*v2 supersedes the cosmic v1. Related: `docs/solary-visual-audit.md` (Phase 1), `docs/solary-gemini-prompts.md` (Phase 3, regenerated grounded), `docs/lovebirds-visual-foundation.md` (sibling).*
*Pending engine work (separate task): soften the 3D planet scene to an abstract warm night-sky/bokeh, rename planet section labels, and finish cosmic copy cleanup.*
