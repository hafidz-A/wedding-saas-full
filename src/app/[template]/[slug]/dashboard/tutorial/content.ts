// Structure for the dashboard tutorials. Copy lives in the i18n dict
// under dashboard.tabs.tutorial.<categoryId> (lovebirds) and
// dashboard.tabs.tutorial.solary.<categoryId> (solary overrides);
// this file only declares shape.
//
// BOTH templates share the same architecture: grouped subnav + search +
// section-guide cards + FAQ accordion. Categories differ only where the
// templates genuinely differ (e.g. solary has no Ornament tab, lovebirds
// has no planet metaphor).

export type TutorialCategoryId =
  | 'start' | 'checklist' | 'editor' | 'sections' | 'palette' | 'ornament'
  | 'music' | 'rsvps' | 'gifts' | 'guests' | 'guestbook' | 'billing' | 'faq'
  | 'quickstart' | 'experience' | 'photos'

export type TutorialGroupId = 'prep' | 'fill' | 'data' | 'help'

/** Ordered groups for the subnav. Label dict key: tutorial.groups.<id> */
export const TUTORIAL_GROUPS: TutorialGroupId[] = ['prep', 'fill', 'data', 'help']

export interface TutorialShot {
  /** file at public/tutorial/<template>/<key>.png */
  key: string
  /** dict key for the caption: dashboard.tabs.tutorial.<categoryId>.shots.<captionKey> */
  captionKey: string
}

export interface TutorialCategory {
  id: TutorialCategoryId
  /** subnav group — both templates render grouped */
  group: TutorialGroupId
  /** dashboard tab this category documents; renders an "open tab" deep-link */
  relatedTab?: string
  /** premium-only categories are hidden for non-premium plans */
  premiumOnly?: boolean
  /** number of numbered steps authored in the dict (steps[0..n-1]) */
  stepCount: number
  /** number of "always" bullets authored in the dict */
  alwaysCount: number
  /** number of "never / don't forget" bullets authored in the dict */
  neverCount: number
  /** number of tips bullets authored in the dict (0 = no tips block) */
  tipCount: number
  /** number of section-guide cards authored in the dict (c.sectionGuides[0..n-1]) */
  sectionGuideCount?: number
  /** number of Q&A pairs authored in the dict (c.faqs[0..n-1]) */
  faqCount?: number
  /** screenshots shown for this category, in order */
  shots: TutorialShot[]
}

export const TUTORIAL_CATEGORIES: TutorialCategory[] = [
  { id: 'start', group: 'prep', stepCount: 6, alwaysCount: 3, neverCount: 3, tipCount: 2,
    shots: [{ key: 'start-header', captionKey: 'header' }] },
  { id: 'checklist', group: 'prep', stepCount: 10, alwaysCount: 2, neverCount: 2, tipCount: 2,
    shots: [{ key: 'checklist-roadmap', captionKey: 'roadmap' }] },
  { id: 'experience', group: 'prep', stepCount: 6, alwaysCount: 0, neverCount: 0, tipCount: 2,
    shots: [] },
  { id: 'editor', group: 'fill', stepCount: 7, alwaysCount: 4, neverCount: 4, tipCount: 5,
    shots: [
      { key: 'editor-list',         captionKey: 'list' },
      { key: 'editor-reorder',      captionKey: 'reorder' },
      { key: 'editor-gallery-rule', captionKey: 'galleryRule' },
      { key: 'editor-save',         captionKey: 'save' },
    ] },
  { id: 'sections', group: 'fill', stepCount: 0, alwaysCount: 2, neverCount: 1, tipCount: 1,
    sectionGuideCount: 14, shots: [] },
  { id: 'photos', group: 'fill', stepCount: 6, alwaysCount: 2, neverCount: 2, tipCount: 3,
    shots: [{ key: 'photos-map', captionKey: 'map' }] },
  { id: 'palette', group: 'fill', stepCount: 3, alwaysCount: 2, neverCount: 1, tipCount: 1,
    shots: [{ key: 'palette-grid', captionKey: 'grid' }] },
  { id: 'ornament', group: 'fill', stepCount: 3, alwaysCount: 2, neverCount: 1, tipCount: 1,
    shots: [{ key: 'ornament-pick', captionKey: 'pick' }] },
  { id: 'music', group: 'fill', stepCount: 4, alwaysCount: 2, neverCount: 2, tipCount: 2,
    shots: [{ key: 'music-upload', captionKey: 'upload' }] },
  { id: 'rsvps', group: 'data', stepCount: 3, alwaysCount: 2, neverCount: 1, tipCount: 2,
    shots: [{ key: 'rsvps-table', captionKey: 'table' }] },
  { id: 'gifts', group: 'data', stepCount: 3, alwaysCount: 2, neverCount: 2, tipCount: 1,
    shots: [{ key: 'gifts-table', captionKey: 'table' }] },
  { id: 'guests', group: 'data', stepCount: 4, alwaysCount: 3, neverCount: 2, tipCount: 2,
    shots: [{ key: 'guests-share', captionKey: 'share' }] },
  { id: 'guestbook', group: 'data', premiumOnly: true, stepCount: 3, alwaysCount: 2, neverCount: 1, tipCount: 1,
    shots: [{ key: 'guestbook-ledger', captionKey: 'ledger' }] },
  { id: 'billing', group: 'help', stepCount: 4, alwaysCount: 2, neverCount: 2, tipCount: 1,
    shots: [
      { key: 'billing-status',  captionKey: 'status' },
      { key: 'billing-upgrade', captionKey: 'upgrade' },
    ] },
  { id: 'faq', group: 'help', stepCount: 0, alwaysCount: 0, neverCount: 0, tipCount: 0,
    faqCount: 13, shots: [] },
]

// Solary mirrors the lovebirds architecture (groups + section guides + FAQ),
// minus the Ornament category — solary's backdrop is its Three.js galactic
// scene, there is no ornament to configure. The planet metaphor gets its own
// extra categories (quickstart, experience, photos). Copy lives under
// dashboard.tabs.tutorial.solary.<categoryId>; screenshots at
// public/tutorial/solary/<key>.png.
export const TUTORIAL_CATEGORIES_SOLARY: TutorialCategory[] = [
  { id: 'quickstart', group: 'prep', relatedTab: 'editor', stepCount: 7, alwaysCount: 2, neverCount: 2, tipCount: 2,
    shots: [{ key: 'quickstart-roadmap', captionKey: 'roadmap' }] },
  { id: 'start', group: 'prep', stepCount: 4, alwaysCount: 2, neverCount: 2, tipCount: 1,
    shots: [{ key: 'start-header', captionKey: 'header' }] },
  { id: 'experience', group: 'prep', stepCount: 6, alwaysCount: 0, neverCount: 0, tipCount: 2,
    shots: [] },
  { id: 'editor', group: 'fill', relatedTab: 'editor', stepCount: 6, alwaysCount: 3, neverCount: 4, tipCount: 4,
    shots: [
      { key: 'editor-list',         captionKey: 'list' },
      { key: 'editor-reorder',      captionKey: 'reorder' },
      { key: 'editor-gallery-rule', captionKey: 'galleryRule' },
      { key: 'editor-save',         captionKey: 'save' },
    ] },
  { id: 'sections', group: 'fill', relatedTab: 'editor', stepCount: 0, alwaysCount: 2, neverCount: 1, tipCount: 1,
    sectionGuideCount: 14, shots: [] },
  { id: 'photos', group: 'fill', relatedTab: 'editor', stepCount: 5, alwaysCount: 0, neverCount: 0, tipCount: 3,
    shots: [{ key: 'photos-map', captionKey: 'map' }] },
  { id: 'palette', group: 'fill', relatedTab: 'palette', stepCount: 3, alwaysCount: 1, neverCount: 1, tipCount: 1,
    shots: [{ key: 'palette-grid', captionKey: 'grid' }] },
  { id: 'music', group: 'fill', relatedTab: 'music', stepCount: 3, alwaysCount: 2, neverCount: 2, tipCount: 1,
    shots: [{ key: 'music-upload', captionKey: 'upload' }] },
  { id: 'rsvps', group: 'data', relatedTab: 'rsvps', stepCount: 2, alwaysCount: 1, neverCount: 1, tipCount: 1,
    shots: [{ key: 'rsvps-table', captionKey: 'table' }] },
  { id: 'gifts', group: 'data', relatedTab: 'gifts', stepCount: 2, alwaysCount: 1, neverCount: 1, tipCount: 0,
    shots: [{ key: 'gifts-table', captionKey: 'table' }] },
  { id: 'guests', group: 'data', relatedTab: 'guests', stepCount: 3, alwaysCount: 2, neverCount: 2, tipCount: 1,
    shots: [{ key: 'guests-share', captionKey: 'share' }] },
  { id: 'guestbook', group: 'data', premiumOnly: true, relatedTab: 'guestbook', stepCount: 2, alwaysCount: 1, neverCount: 1, tipCount: 0,
    shots: [{ key: 'guestbook-ledger', captionKey: 'ledger' }] },
  { id: 'billing', group: 'help', stepCount: 4, alwaysCount: 2, neverCount: 2, tipCount: 1,
    shots: [] },
  { id: 'faq', group: 'help', faqCount: 12, stepCount: 0, alwaysCount: 0, neverCount: 0, tipCount: 0,
    shots: [] },
]

/** Category list for a template's tutorial. Solary drops the ornament category. */
export function getTutorialCategories(template: string): TutorialCategory[] {
  return template === 'solary' ? TUTORIAL_CATEGORIES_SOLARY : TUTORIAL_CATEGORIES
}
