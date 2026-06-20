# Solaary — Gemini Prompt Library (Phase 3 · v2 grounded)

> Regenerated for the **"starlit romance / grounded"** direction (see
> `docs/solary-visual-foundation.md` v2). Cosmic backdrops removed — every scene is a real
> place, beautifully lit. A **real night sky** is allowed only where it's earthly (the
> Mt Bromo proposal). No galaxies, planets, nebulae, cosmic dust, or floating-in-space.
> Prompts only for **REPLACE** assets. KEEP (not prompted): party avatars; the 3D scene/
> planet textures are pending the separate engine-softening task.

## How to use
Each prompt = the reusable blocks below pasted in verbatim + the per-asset body. Generate a
master **reference sheet** first, then carry its seed/reference into every asset so identity
never drifts.

---

## REUSABLE BLOCKS (paste into every prompt)

**`[ARUNA]` — recurring bride:** Aruna, an Indonesian woman. **Warm light-to-medium
complexion with a healthy natural glow and warm-neutral (soft honey-beige) undertones —
luminous, never whitened; her skin hue stays consistent but its brightness/warmth responds
naturally to the scene's light.** Dark near-black hair, long and softly wavy — half-up
everyday, elegant low updo at formal moments. Soft oval face, warm dark-brown eyes, gentle
full brows, natural warm smile. Anchors every time: small beauty mark high on her left
cheek, delicate gold ear stud / thin ear-cuff, a fine gold pendant. Petite-to-average
graceful build; ~one head shorter than Daksa. Wardrobe in dusty rose / plum / cream / soft
gold.

**`[DAKSA]` — recurring groom:** Daksa, an Indonesian man. **Natural warm tan complexion,
healthy and realistic, slightly deeper than Aruna's — never muddy, never washed-out;
consistent hue that shifts naturally with sunlight, shade, indoor and golden-hour light.**
Black hair, short, neat, slight texture, consistent light stubble. Soft-angular jaw, warm
dark eyes, defined brows, easy grin. Anchors every time: light stubble, simple matte watch
on left wrist, a refined lapel detail at formal moments. Average-tall, relaxed broad
shoulders; ~one head taller than Aruna. Wardrobe in charcoal / deep indigo / warm taupe.

**`[STYLE]` — locked render style:** Premium **editorial romance illustration**, *cartoonized
but mature*, semi-realistic, ≈6.5–7 heads (adult proportions, never chibi). Fine-art wedding
feel — luxury wedding editorial / romantic garden & destination / European editorial.
Clean confident medium-weight contour in deep espresso/plum-brown (not pure black), minimal
interior linework. Flat base + soft volumetric shading, warm subsurface skin, fine tasteful
film grain. **Mood set by the scene's REAL light** (window light, golden hour, candlelight,
garden softness, string lights). Leave ~60–80% of tasteful real-environment negative space
around the couple. Timeless, warm, human, premium.

**`[NEG]` — global negative (append per-asset extras):** different or inconsistent faces
between images, identity drift, missing signature anchors, **overly dark / muddy /
washed-out / artificially whitened / beauty-filter / plastic / CGI skin**, extra or missing
fingers, malformed or fused hands, plastic mannequin pose, doll-like blank stare, both
subjects facing camera in stiff symmetrical stock-photo pose, frozen posing, blank smiling
at camera, emotionless faces, watermark, text, caption, logo, signature, harsh on-camera
flash, oversaturation, lowres, jpeg artifacts, childish chibi or big-head proportions,
anime, glossy 3D Pixar render, cluttered background, symbolic object shown alone with no
people, faceless silhouette as the main subject, **galaxies, planets, nebulae, cosmic dust,
starfield-as-background, outer space, sci-fi or fantasy-universe aesthetics.**

---

## 1 · GATE PORTRAITS — identity refrain (twinkle on every section + footer frames)

### GATE-01
- **Section:** Opening Gate / footer frames · **Story Purpose:** the formal "this is the couple" anchor portrait shown throughout.
- **PROMPT:** `[ARUNA]` `[DAKSA]` (present ages ~30/32, refined).
**CONSISTENCY:** mandatory — same faces and anchors as the reference sheet.
**STORYTELLING RULES:** a cherished real-couple portrait, quiet chemistry visible; not a stiff studio shot.
**SCENE:** Aruna and Daksa standing close in an elegant formal portrait, Daksa's arm gently around her, both turned slightly toward each other in a soft shared glance.
**ENVIRONMENT:** refined evening reception setting — warm candlelight and soft bokeh of string lights behind them.
**COMPOSITION:** near-square small-card crop, couple centered and readable at thumbnail size, three-quarter angle, soft negative space.
**STYLE:** `[STYLE]`.
**NEGATIVE:** `[NEG]` + no stiff straight-to-camera lineup.

### GATE-02
- **Section:** Opening Gate / twinkle · **Story Purpose:** candid human counter-note.
- **PROMPT:** `[ARUNA]` `[DAKSA]` (~28/30).
**CONSISTENCY:** mandatory — identical to GATE-01.
**STORYTELLING RULES:** a caught, unposed instant of laughter; the viewer feels they interrupted a real moment.
**SCENE:** the couple laughing together outdoors, Daksa mid-laugh, Aruna leaning into his shoulder, hands naturally interacting.
**ENVIRONMENT:** open-air golden-hour park/garden, warm low sun.
**COMPOSITION:** near-square small-card crop, candid three-quarter framing, subjects off-center.
**STYLE:** `[STYLE]`.
**NEGATIVE:** `[NEG]` + no rigid matching grins at camera.

### GATE-03  *(fixes the faceless-silhouette failure)*
- **Section:** Opening Gate / twinkle · **Story Purpose:** golden-hour intimacy — faces visible.
- **PROMPT:** `[ARUNA]` `[DAKSA]` (~29/31).
**CONSISTENCY:** mandatory — **faces lit and visible, not silhouetted.**
**STORYTELLING RULES:** tender golden-hour closeness; warmth and trust legible on both faces.
**SCENE:** the couple foreheads almost touching at sunset, Aruna's hand on Daksa's chest, soft smiles, eyes lowered.
**ENVIRONMENT:** golden-hour beach or hillside, warm sun catching their faces.
**COMPOSITION:** near-square crop, tight two-shot, faces clearly lit.
**STYLE:** `[STYLE]`.
**NEGATIVE:** `[NEG]` + no full silhouette, no faces hidden in shadow.

---

## 2 · WELCOME (Neptune section) — the introduction

### WEL-01
- **Section:** Welcome ("We found each other…", caption *Bali, 2023*) · **Story Purpose:** first emotional handshake — meet the couple.
- **PROMPT:** `[ARUNA]` `[DAKSA]` (~27/29).
**CONSISTENCY:** mandatory.
**STORYTELLING RULES:** reads as a warm introduction; the couple welcomes the viewer; genuine ease between them.
**SCENE:** Aruna and Daksa close together, gently turned to the viewer yet connected to each other — his hand over hers, calm inviting smiles.
**ENVIRONMENT:** Bali at golden hour — soft tropical greenery and warm sea light behind them.
**COMPOSITION:** vertical 4:5 portrait, faces dominant, upper-body, airy space above.
**STYLE:** `[STYLE]`.
**NEGATIVE:** `[NEG]` + no stock-headshot stiffness.

### WEL-02  *(only if Welcome layout = "duo")*
- **Section:** Welcome (caption *Jakarta, 2024*) · **Story Purpose:** second introduction beat, more candid.
- **PROMPT:** `[ARUNA]` `[DAKSA]` (~28/30).
**CONSISTENCY:** mandatory — identical to WEL-01.
**STORYTELLING RULES:** easy everyday closeness, a couple comfortable in their own city.
**SCENE:** the two walking and talking, Daksa glancing at Aruna as she smiles ahead, shoulders brushing.
**ENVIRONMENT:** Jakarta street at warm dusk — soft bokeh of café and city lights.
**COMPOSITION:** vertical 4:5, three-quarter walking two-shot, motion implied.
**STYLE:** `[STYLE]`.
**NEGATIVE:** `[NEG]` + no posed standstill.

---

## 3 · OUR STORY TIMELINE — the 5 fixed milestones

### STORY-01 · 2019 · First Orbit
- **Story Purpose:** they MET — "crossed paths at a friend's birthday in Bandung."
- **PROMPT:** `[ARUNA]` `[DAKSA]` (youthful, ~23/25).
**CONSISTENCY:** mandatory — same two people, slightly younger.
**STORYTELLING RULES:** the **first glance** between strangers; a spark of curiosity; show people meeting, not the cake.
**SCENE:** at a friend's birthday gathering, Aruna and Daksa catching each other's eye across the room for the first time, a candle-lit cake softly out of focus behind.
**ENVIRONMENT:** warm Bandung house-party interior, fairy lights, friends blurred around them.
**COMPOSITION:** polaroid ~4:5, two figures linked by their gaze across a gentle gap, the moment of noticing centered.
**STYLE:** `[STYLE]`.
**NEGATIVE:** `[NEG]` + no birthday-cake-only still life, no empty room, no couple already embracing.

### STORY-02 · 2021 · Gravity
- **Story Purpose:** the long-distance year that pulled them *closer, not apart*.
- **PROMPT:** `[ARUNA]` `[DAKSA]` (~25/27).
**CONSISTENCY:** mandatory — faces lit and visible.
**STORYTELLING RULES:** convey distance and longing toward each other; the ache and the bond at once.
**SCENE:** a split, mirrored moment — Aruna and Daksa each at home in different cities at night, each holding a phone glowing on their face in a warm video call, reaching toward the other.
**ENVIRONMENT:** two cozy bedrooms/desks at night, warm lamp light, a city window behind each.
**COMPOSITION:** polaroid ~4:5, diptych-like split; neither is a silhouette.
**STYLE:** `[STYLE]`.
**NEGATIVE:** `[NEG]` + no faceless silhouette, no abstract "stream of stars" connector, no plain couple-walking shot.

### STORY-03 · 2023 · Aligned
- **Story Purpose:** same city at last — "coffee mornings became routine."
- **PROMPT:** `[ARUNA]` `[DAKSA]` (~27/29).
**CONSISTENCY:** mandatory.
**STORYTELLING RULES:** quiet, settled comfort; a lived-in shared routine; show the two sharing the coffee, not a cup.
**SCENE:** the couple at a small morning table sharing coffee — Aruna mid-laugh holding her mug, Daksa resting his chin on his hand watching her fondly.
**ENVIRONMENT:** cozy sunlit apartment kitchen at morning, two mugs, soft window light.
**COMPOSITION:** polaroid ~4:5, intimate over-the-table two-shot, both relaxed.
**STYLE:** `[STYLE]`.
**NEGATIVE:** `[NEG]` + no coffee-cup-only still life, no empty café interior.

### STORY-04 · 2025 · The Proposal
- **Story Purpose:** the climax — "Under the stars on Mount Bromo. She said yes."
- **PROMPT:** `[ARUNA]` `[DAKSA]` (~29/31).
**CONSISTENCY:** mandatory.
**STORYTELLING RULES:** peak emotion — Daksa proposing, **Aruna's genuine emotional reaction** (hand to mouth, eyes shining); the ring is incidental, the faces are everything.
**SCENE:** Daksa on one knee offering a small ring, looking up at Aruna; Aruna overwhelmed with joyful tears, reaching for him.
**ENVIRONMENT:** Mount Bromo at night under a **real clear starry sky** (a natural meteor streak is fine — it is the night sky, not sci-fi); volcanic ridgeline below; the couple lit by warm lantern/torch light.
**COMPOSITION:** polaroid ~4:5, the couple as the subject against the natural night sky, reaction-driven, Aruna's face visible.
**STYLE:** `[STYLE]`.
**NEGATIVE:** `[NEG]` + no ring-only close-up, no empty mountain, no galaxy/nebula/cosmic-dust sky (a plain natural starscape only).

### STORY-05 · 2027 · The Wedding
- **Story Purpose:** the union — the invitation itself, Plataran Menteng.
- **PROMPT:** `[ARUNA]` `[DAKSA]` (~31/33, wedding attire).
**CONSISTENCY:** mandatory — Aruna in ivory-gold gown + updo, Daksa in elegant dark formal; same faces.
**STORYTELLING RULES:** culmination and joy — the couple **experiencing the ceremony**, not décor; vows or first embrace.
**SCENE:** Aruna and Daksa at the altar mid-vow / first married embrace, foreheads close, visibly moved.
**ENVIRONMENT:** lush garden-pavilion ceremony at twilight, string lights and soft floral arch framing (not the subject).
**COMPOSITION:** polaroid ~4:5, couple-centered, faces visible, décor only as frame.
**STYLE:** `[STYLE]`.
**NEGATIVE:** `[NEG]` + no empty ceremony arch, no decoration without the couple.

---

## 4 · GALLERY OF MEMORIES (Saturn-ring section, ~3:2) — couple living each caption

> Every frame contains the couple living the captioned moment in its real place. Era cues
> keep aging coherent.

### GAL-01 · "First Coffee" (~24/26)
`[ARUNA]` `[DAKSA]`. **CONSISTENCY:** mandatory. **STORYTELLING:** first awkward-sweet date, nervous chemistry. **SCENE:** the two at a small café table leaning in, shy smiles, two cups between them. **ENVIRONMENT:** warm café, soft window light. **COMPOSITION:** 3:2, couple framed together, café context readable. **STYLE:** `[STYLE]`. **NEG:** `[NEG]` + no coffee-cup-only still life.

### GAL-02 · "Bandung Sunset" (~23/25)
`[ARUNA]` `[DAKSA]`. **CONSISTENCY:** mandatory; **faces visible.** **STORYTELLING:** an early walk where it started to feel like love. **SCENE:** the couple walking a Bandung hillside at sunset, hands linked, glancing at each other. **ENVIRONMENT:** tea-plantation hills, warm golden sky. **COMPOSITION:** 3:2, two figures, faces lit. **STYLE:** `[STYLE]`. **NEG:** `[NEG]` + no silhouette, no empty landscape.

### GAL-03 · "Beach Drive" (~26/28)
`[ARUNA]` `[DAKSA]`. **CONSISTENCY:** mandatory. **STORYTELLING:** carefree road-trip joy. **SCENE:** the couple in an open car by the coast, Aruna's arm out the window laughing, Daksa driving and grinning at her. **ENVIRONMENT:** coastal road, sea horizon, bright daylight. **COMPOSITION:** 3:2, both in frame, motion implied. **STYLE:** `[STYLE]`. **NEG:** `[NEG]` + no empty car or road without people.

### GAL-04 · "Hiking Day" (~26/28)
`[ARUNA]` `[DAKSA]`. **CONSISTENCY:** mandatory. **STORYTELLING:** teamwork and trust on a trail. **SCENE:** Daksa helping Aruna up a rock, both mid-effort and laughing. **ENVIRONMENT:** green ridge trail, wide sky, daylight. **COMPOSITION:** 3:2, couple interacting, gesture-led. **STYLE:** `[STYLE]`. **NEG:** `[NEG]` + no empty scenery.

### GAL-05 · "Movie Night" (~27/29)
`[ARUNA]` `[DAKSA]`. **CONSISTENCY:** mandatory. **STORYTELLING:** cozy domestic intimacy. **SCENE:** the two curled on a couch under a blanket, screen-light on their faces, Aruna's head on Daksa's shoulder. **ENVIRONMENT:** dim living room, warm screen glow. **COMPOSITION:** 3:2, intimate two-shot. **STYLE:** `[STYLE]`. **NEG:** `[NEG]` + no empty cinema/room.

### GAL-06 · "Birthday Dinner" (~25/27)
`[ARUNA]` `[DAKSA]`. **CONSISTENCY:** mandatory. **STORYTELLING:** celebrating each other. **SCENE:** Daksa surprising Aruna with a small cake, her delighted reaction, candle glow on both faces. **ENVIRONMENT:** warm restaurant nook, fairy lights. **COMPOSITION:** 3:2, couple + cake as context. **STYLE:** `[STYLE]`. **NEG:** `[NEG]` + no cake-only still life.

### GAL-07 · "Anniversary" (~28/30)
`[ARUNA]` `[DAKSA]`. **CONSISTENCY:** mandatory. **STORYTELLING:** a tender milestone toast. **SCENE:** the couple clinking glasses across a candlelit table, eyes locked, soft smiles. **ENVIRONMENT:** intimate restaurant, low warm light. **COMPOSITION:** 3:2, both faces visible. **STYLE:** `[STYLE]`. **NEG:** `[NEG]` + no glasses/table-only still life.

### GAL-08 · "Sunrise Hike" (~27/29)
`[ARUNA]` `[DAKSA]`. **CONSISTENCY:** mandatory. **STORYTELLING:** awe shared at dawn. **SCENE:** the couple at a summit wrapped in one blanket watching sunrise, Daksa pointing, Aruna leaning into him. **ENVIRONMENT:** mountain summit, warm dawn light. **COMPOSITION:** 3:2, couple foreground, sky behind. **STYLE:** `[STYLE]`. **NEG:** `[NEG]` + no empty sky/landscape.

### GAL-09 · "The Question" (2025, ~29/31)
`[ARUNA]` `[DAKSA]`. **CONSISTENCY:** mandatory. **STORYTELLING:** gallery framing of the proposal (see STORY-04). **SCENE:** Daksa kneeling, Aruna's hands to her face in joyful shock. **ENVIRONMENT:** Mt Bromo, real starry night, warm lantern light. **COMPOSITION:** 3:2, couple-centered, reaction-led. **STYLE:** `[STYLE]`. **NEG:** `[NEG]` + no ring-only close-up, no galaxy/nebula sky.

### GAL-10 · "She Said Yes" (2025, ~29/31)
`[ARUNA]` `[DAKSA]`. **CONSISTENCY:** mandatory; **faces visible.** **STORYTELLING:** the jubilant embrace right after the yes. **SCENE:** Daksa lifting/holding Aruna as both laugh and cry with joy, ring on her hand. **ENVIRONMENT:** Bromo at night, natural starscape, lantern glow. **COMPOSITION:** 3:2, joyful two-shot. **STYLE:** `[STYLE]`. **NEG:** `[NEG]` + no silhouette, no empty mountain.

### GAL-11 · "Celebration" (~29/31)
`[ARUNA]` `[DAKSA]`. **CONSISTENCY:** mandatory. **STORYTELLING:** sharing the engagement joy with sparklers. **SCENE:** the couple holding sparklers together, faces lit, laughing toward each other. **ENVIRONMENT:** night garden gathering, friends blurred, fairy lights. **COMPOSITION:** 3:2, couple central, sparkler light. **STYLE:** `[STYLE]`. **NEG:** `[NEG]` + no sparkler-only still life.

### GAL-12 · "Venue Visit" (~30/32)
`[ARUNA]` `[DAKSA]`. **CONSISTENCY:** mandatory. **STORYTELLING:** dreaming the day together while scouting the venue. **SCENE:** the couple walking the garden pavilion hand in hand, gesturing excitedly about the space. **ENVIRONMENT:** Plataran-style garden pavilion, daylight. **COMPOSITION:** 3:2, couple in the space (not the space alone). **STYLE:** `[STYLE]`. **NEG:** `[NEG]` + no empty venue without people.

### GAL-13 · "Dress Fitting" (~30)
`[ARUNA]` (bride-focused, Daksa optional/absent). **CONSISTENCY:** mandatory — same Aruna. **STORYTELLING:** her quietly emotional moment seeing herself as a bride. **SCENE:** Aruna in a fitting gown turning to a mirror, a hand to her heart, eyes glistening. **ENVIRONMENT:** soft bridal atelier, warm daylight. **COMPOSITION:** 3:2, Aruna + her reflection, genuine emotion. **STYLE:** `[STYLE]`. **NEG:** `[NEG]` + no dress-on-hanger-only still life.

### GAL-14 · "Cake Tasting" (~30/32)
`[ARUNA]` `[DAKSA]`. **CONSISTENCY:** mandatory. **STORYTELLING:** playful planning together. **SCENE:** the couple tasting cake, Daksa feeding Aruna a forkful, both giggling. **ENVIRONMENT:** bright bakery counter. **COMPOSITION:** 3:2, couple + cake as context. **STYLE:** `[STYLE]`. **NEG:** `[NEG]` + no cake-only still life.

### GAL-15 · "Pre-wed Shoot" (~30/32)
`[ARUNA]` `[DAKSA]`. **CONSISTENCY:** mandatory. **STORYTELLING:** a styled but candid moment of being thoroughly in love. **SCENE:** the couple in coordinated outfits, Daksa twirling Aruna, both laughing freely. **ENVIRONMENT:** golden field at sunset. **COMPOSITION:** 3:2, dynamic two-shot, motion. **STYLE:** `[STYLE]`. **NEG:** `[NEG]` + no stiff posed portrait.

### GAL-16 · "Family Brunch" (~30/32)
`[ARUNA]` `[DAKSA]` (couple-centered, family hinted). **CONSISTENCY:** mandatory. **STORYTELLING:** two families becoming one. **SCENE:** the couple at the head of a brunch table mid-laugh, a few family members softly blurred around them. **ENVIRONMENT:** sunlit home dining, abundant table. **COMPOSITION:** 3:2, couple as focus, others as context. **STYLE:** `[STYLE]`. **NEG:** `[NEG]` + no food-spread-only still life.

### GAL-17 · "Save the Date" (~30/32)
`[ARUNA]` `[DAKSA]`. **CONSISTENCY:** mandatory. **STORYTELLING:** the giddy moment of making it official. **SCENE:** the couple holding up a "save the date" card toward the viewer, beaming, cheek to cheek. **ENVIRONMENT:** cozy home corner, fairy lights, daylight window. **COMPOSITION:** 3:2, couple + card, faces dominant. **STYLE:** `[STYLE]`. **NEG:** `[NEG]` + no stationery-only flat-lay.

### GAL-18 · "Last Steps" (2027 wedding day, ~31/33)
`[ARUNA]` `[DAKSA]` (wedding attire). **CONSISTENCY:** mandatory — gown + elegant dark formal, same faces. **STORYTELLING:** the final breath before forever — about to walk in together. **SCENE:** the couple just outside the ceremony doors, foreheads together, hands clasped, nervous-joyful smiles. **ENVIRONMENT:** pavilion entrance at twilight, string lights. **COMPOSITION:** 3:2, intimate two-shot, faces close. **STYLE:** `[STYLE]`. **NEG:** `[NEG]` + no wedding-rings-only close-up, no empty doorway.

---

*v2 grounded library: 3 gate + 2 welcome + 5 story + 18 gallery = 28 prompts. Conforms to
`docs/solary-visual-foundation.md` v2. Real-world settings throughout; the only night sky is
the natural one at the Bromo proposal.*
