/**
 * Server-side helper that takes the bundled pageConfig template and customizes
 * it for a specific couple. Mirrors the logic in `scripts/lib/config-transform.mjs`
 * so that signup-onboarding produces the same shape as the CLI `seed-full-config`
 * script (--full flag).
 *
 * The CLI script is kept for ops use; this TS port is for the browser-driven
 * onboarding flow. Both produce identical configs for a given input.
 */

// Import the Lovebirds template's default config as the base to customize.
// defaultConfig.js is plain ESM and works as-is from TS at runtime.
import { defaultConfig as pageConfig } from '@/all-templates/lovebirds/defaultConfig'

export interface CoupleSeedInput {
  brideName: string
  groomName: string
  weddingDate: string // ISO datetime
  venue: string
}

interface DerivedNames {
  coupleName: string
  monogram: string
  hashtag: string
  formattedDate: string
}

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0]
}

function deriveNames({ brideName, groomName, weddingDate }: CoupleSeedInput): DerivedNames {
  const bride = firstName(brideName)
  const groom = firstName(groomName)
  return {
    coupleName: `${bride} & ${groom}`,
    monogram: `${bride[0]} & ${groom[0]}`,
    hashtag: `#${bride}And${groom}`,
    formattedDate: new Date(weddingDate).toLocaleDateString('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
  }
}

/**
 * Build a fresh config object customized for the given couple. The default
 * pageConfig is deep-cloned so callers can mutate freely. Every section is
 * marked enabled (full template, equivalent to --full in the CLI script).
 */
export function buildSeedConfig(input: CoupleSeedInput): Record<string, any> {
  const config = JSON.parse(JSON.stringify(pageConfig)) as Record<string, any>
  const { coupleName, monogram, hashtag, formattedDate } = deriveNames(input)
  const bride = firstName(input.brideName)
  const groom = firstName(input.groomName)

  for (const section of config.sections) {
    const p = section.props
    if (!p) continue

    switch (section.type) {
      case 'hero':
        p.coupleName = coupleName
        p.brideName = bride
        p.groomName = groom
        p.weddingDate = input.weddingDate
        if (input.venue) p.venue = input.venue
        break

      case 'countdown':
        p.weddingDate = input.weddingDate
        break

      case 'ourStory': {
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
              ev.date = formattedDate
              ev.location = input.venue || ev.location
            }
          }
        }
        break

      case 'brideGroom':
        if (Array.isArray(p.people)) {
          for (const person of p.people) {
            if (person.role === 'Bride') {
              person.name = input.brideName
              person.parents = ''
            }
            if (person.role === 'Groom') {
              person.name = input.groomName
              person.parents = ''
            }
          }
        }
        break

      case 'weddingGift':
        if (Array.isArray(p.accounts) && p.accounts.length > 0) {
          p.accounts[0].accountHolder = input.brideName
        }
        break

      case 'footer':
        p.coupleName = coupleName
        p.monogram = monogram
        p.hashtag = hashtag
        break
    }

    // Force every section enabled (--full mode)
    section.enabled = true
  }

  config.couple = { name1: bride, name2: groom }
  config.meta = {
    titleSuffix: 'Our Wedding',
    description: 'Cinematic wedding invitation experience',
  }

  return config
}

/**
 * Validate a user-chosen slug. Returns the cleaned slug or throws.
 * Rules: 3-40 chars, lowercase letters / digits / hyphens, no leading/trailing
 * hyphen, no double-hyphen. Matches what the CLI bootstrap script accepts.
 */
export function validateSlug(raw: string): string {
  const slug = raw.trim().toLowerCase()
  if (slug.length < 3 || slug.length > 40) {
    throw new Error('Slug harus 3–40 karakter')
  }
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
    throw new Error('Slug hanya boleh huruf kecil, angka, dan tanda hubung (-)')
  }
  return slug
}
