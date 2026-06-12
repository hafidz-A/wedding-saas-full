/* ============================================================
   normalizeConfig.js — make the Solary scene adaptive to ANY
   section arrangement (original, reordered, swapped, added).
   ------------------------------------------------------------
   Two jobs, both derived at render time so they self-heal old
   saved configs (the dashboard editor doesn't need to migrate):

   1. sectionLabel — the card kicker ("RSVP Planet · Earth").
      It is NOT user-editable, so it must always match the section
      TYPE. When a section's type is swapped (e.g. teamPlanet →
      quotePlanet) older saves keep the previous type's label
      ("Bridal Party") — we detect that leftover and replace it
      with the new type's label.

   2. planetKey / planetName — the physical celestial body the 3D
      camera frames at this slot. Swap preserves it (positional),
      but a freshly ADDED section has none, which would leave the
      camera staring at the empty galaxy backdrop. We assign the
      next unused planet from the canonical pool so every section
      has a real planet to fit, in any arrangement.
   ============================================================ */

// Canonical label per section type (mirrors the editor schema defaults).
export const SECTION_LABELS = {
  welcomePlanet:    'Welcome',
  storyPlanet:      'Our Story',
  saturnRing:       'Gallery',
  countdownPlanet:  'Save the Date',
  detailsPlanet:    'The Details',
  rsvpPlanet:       'RSVP',
  teamPlanet:       'Bridal Party',
  giftPlanet:       'Gifts',
  quotePlanet:      'Quote',
  schedulePlanet:   'Schedule',
  liveStreamPlanet: 'Live Stream',
  faqPlanet:        'FAQ',
  footerPlanet:     'End of Transmission',
};

// Every canonical label — used to recognise a label left over from a
// previous section type (so we only overwrite genuine swap leftovers,
// never a bespoke label like Saturn's "Gallery of Memories").
const ALL_LABELS = new Set(Object.values(SECTION_LABELS));

// Assignable planets in journey order (andromeda = intro, sun = footer
// are pinned and excluded). Matches the demo's outer→inner sequence.
const PLANET_POOL = ['neptune', 'uranus', 'saturn', 'jupiter', 'mars', 'earth', 'venus', 'mercury'];

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

function fixLabel(type, stored) {
  const canonical = SECTION_LABELS[type];
  if (!canonical) return stored;          // unknown / gate type — leave as-is
  if (!stored) return canonical;          // missing — fill from type
  if (stored === canonical) return stored;
  // Differs from canonical: replace only if it's another type's default
  // (i.e. a leftover from a type swap). Otherwise keep the bespoke label.
  return ALL_LABELS.has(stored) ? canonical : stored;
}

export function normalizeSolaryConfig(config) {
  if (!config || !Array.isArray(config.sections)) return config;

  // Planets are POSITIONAL. The first section (openingGate) frames Andromeda,
  // the last (footerPlanet) frames the Sun; everything between maps to the
  // canonical PLANET_POOL in journey order. We override any stored planetKey so
  // a reordered/swapped section always adopts the planet of the slot it lands
  // in — never carries its old planet with it.
  //
  // Exceptions to pure position:
  // • saturnRing ALWAYS gets Saturn — its photo ring is physically parented to
  //   the Saturn group in the 3D scene, so framing any other planet would show
  //   an empty sky while the photos orbit off-camera.
  // • Disabled sections are skipped entirely (they don't render, so they must
  //   not consume a planet from the pool and shift everything after them).
  // • If more middle sections exist than pool planets, the pool CYCLES —
  //   revisiting a planet beats falling back to 'andromeda', which fades the
  //   whole solar system out (activeKey 'andromeda' → opacity 0).
  const sections = config.sections;
  const enabled = sections.filter((s) => s.enabled !== false);
  const lastEnabledIdx = enabled.length - 1;
  const hasSaturnRing = enabled.some(
    (s, i) => s.type === 'saturnRing' && i !== 0 && i !== lastEnabledIdx,
  );
  const pool = hasSaturnRing ? PLANET_POOL.filter((k) => k !== 'saturn') : PLANET_POOL;

  let poolIdx = 0;
  const planetByEnabledIdx = new Map();
  enabled.forEach((s, i) => {
    let key;
    if (s.type === 'openingGate' || i === 0) key = 'andromeda';
    else if (s.type === 'footerPlanet' || i === lastEnabledIdx) key = 'sun';
    else if (s.type === 'saturnRing') key = 'saturn';
    else {
      key = pool[poolIdx % pool.length];
      poolIdx += 1;
    }
    planetByEnabledIdx.set(s, key);
  });

  const out = sections.map((s) => {
    const props = s.props || {};
    const next = { ...props };

    // 1. self-healing sectionLabel (label travels with the section)
    const label = fixLabel(s.type, props.sectionLabel);
    if (label !== props.sectionLabel) next.sectionLabel = label;

    // 2. positional planet — always derived, overriding stored values.
    //    Disabled sections keep a harmless placeholder (they never render).
    const key = planetByEnabledIdx.get(s) || 'andromeda';
    next.planetKey = key;
    next.planetName = cap(key);

    return { ...s, props: next };
  });

  return { ...config, sections: out };
}

export default normalizeSolaryConfig;
