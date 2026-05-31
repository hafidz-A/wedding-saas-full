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
  const sections = config.sections;
  const lastIdx = sections.length - 1;
  let poolIdx = 0;

  const planetFor = (s, idx) => {
    if (s.type === 'openingGate' || idx === 0) return 'andromeda';
    if (s.type === 'footerPlanet' || idx === lastIdx) return 'sun';
    const key = PLANET_POOL[poolIdx] || 'andromeda';
    poolIdx += 1;
    return key;
  };

  const out = sections.map((s, idx) => {
    const props = s.props || {};
    const next = { ...props };

    // 1. self-healing sectionLabel (label travels with the section)
    const label = fixLabel(s.type, props.sectionLabel);
    if (label !== props.sectionLabel) next.sectionLabel = label;

    // 2. positional planet — always derived, overriding stored values
    const key = planetFor(s, idx);
    next.planetKey = key;
    next.planetName = cap(key);

    return { ...s, props: next };
  });

  return { ...config, sections: out };
}

export default normalizeSolaryConfig;
