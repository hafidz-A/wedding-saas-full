// scripts/lib/config-transform.mjs

/** Extract first name from a full name string. */
export function firstName(fullName) {
  return fullName.trim().split(/\s+/)[0]
}

/**
 * Derive all computed couple strings from raw inputs.
 * Returns: { coupleName, monogram, hashtag, formattedDate }
 */
export function deriveNames({ brideName, groomName, weddingDate }) {
  const bride = firstName(brideName)
  const groom = firstName(groomName)
  return {
    coupleName:    `${bride} & ${groom}`,
    monogram:      `${bride[0]} & ${groom[0]}`,
    hashtag:       `#${bride}And${groom}`,
    formattedDate: new Date(weddingDate).toLocaleDateString('en-US', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    }),
  }
}

/**
 * Apply couple-specific replacements to a deep-cloned config object.
 * Mutates and returns the config.
 */
export function replaceSections(config, { brideName, groomName, weddingDate, venue }) {
  const { coupleName, monogram, hashtag, formattedDate } = deriveNames({
    brideName, groomName, weddingDate,
  })
  const bride = firstName(brideName)
  const groom = firstName(groomName)

  for (const section of config.sections) {
    const p = section.props
    if (!p) continue

    switch (section.type) {
      case 'hero':
        p.coupleName  = coupleName
        p.brideName   = bride
        p.groomName   = groom
        p.weddingDate = weddingDate
        break

      case 'countdown':
        p.weddingDate = weddingDate
        break

      case 'ourStory': {
        // Only replace the last card's date (The Wedding Day).
        // Preceding story cards are creative placeholders — leave them.
        const stories = p.stories ?? p.cards ?? []
        if (stories.length > 0) {
          const last = stories[stories.length - 1]
          last.date = formattedDate
        }
        break
      }

      case 'eventDetails':
        if (Array.isArray(p.events)) {
          for (const ev of p.events) {
            if (ev.id === 'ceremony' || ev.id === 'reception') {
              ev.date     = formattedDate
              ev.location = venue || ev.location
            }
          }
        }
        break

      case 'brideGroom':
        if (Array.isArray(p.people)) {
          for (const person of p.people) {
            if (person.role === 'Bride') {
              person.name    = brideName
              person.parents = ''
            }
            if (person.role === 'Groom') {
              person.name    = groomName
              person.parents = ''
            }
          }
        }
        break

      case 'weddingGift':
        if (Array.isArray(p.accounts) && p.accounts.length > 0) {
          p.accounts[0].accountHolder = brideName
        }
        break

      case 'footer':
        p.coupleName = coupleName
        p.monogram   = monogram
        p.hashtag    = hashtag
        break
    }
  }

  // Canonical couple = the single source of truth for the couple's names
  // (drives navbar/hero/footer/SEO title via render-time injection). Mirror
  // src/lib/onboarding/seed-config.ts: store the names + a title suffix and let
  // the SEO title derive from them — no denormalized meta.title.
  config.couple = { name1: bride, name2: groom }
  config.meta = {
    titleSuffix: 'Our Wedding',
    description: 'Cinematic wedding invitation experience',
  }

  return config
}

/**
 * Set enabled: true on every section in the config.
 * Mutates and returns the config.
 */
export function enableAll(config) {
  for (const section of config.sections) {
    section.enabled = true
  }
  return config
}
