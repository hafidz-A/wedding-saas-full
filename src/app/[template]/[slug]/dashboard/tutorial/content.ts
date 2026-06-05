// Structure for the lovebirds dashboard tutorial. Copy lives in the i18n dict
// under dashboard.tabs.tutorial.<categoryId>; this file only declares shape.

export type TutorialCategoryId =
  | 'start' | 'checklist' | 'editor' | 'sections' | 'palette' | 'ornament'
  | 'music' | 'rsvps' | 'gifts' | 'guests' | 'guestbook' | 'billing' | 'faq'

export type TutorialGroupId = 'prep' | 'fill' | 'data' | 'help'

/** Ordered groups for the lovebirds subnav. Label dict key: tutorial.groups.<id> */
export const TUTORIAL_GROUPS: TutorialGroupId[] = ['prep', 'fill', 'data', 'help']

export interface TutorialShot {
  /** file at public/tutorial/<template>/<key>.png */
  key: string
  /** dict key for the caption: dashboard.tabs.tutorial.<categoryId>.shots.<captionKey> */
  captionKey: string
}

export interface TutorialCategory {
  id: TutorialCategoryId
  /** when set, the subnav renders grouped (lovebirds). Solary omits it → flat. */
  group?: TutorialGroupId
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
    shots: [] },
  { id: 'editor', group: 'fill', stepCount: 6, alwaysCount: 4, neverCount: 4, tipCount: 3,
    shots: [
      { key: 'editor-list',         captionKey: 'list' },
      { key: 'editor-gallery-rule', captionKey: 'galleryRule' },
      { key: 'editor-save',         captionKey: 'save' },
    ] },
  { id: 'sections', group: 'fill', stepCount: 0, alwaysCount: 2, neverCount: 1, tipCount: 1,
    sectionGuideCount: 14, shots: [] },
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
    faqCount: 10, shots: [] },
]

// Solary shares the same dashboard tabs as lovebirds EXCEPT the Background/Ornament
// tab — solary renders its own Three.js galactic scene, so that category is dropped.
// Copy lives under dashboard.tabs.tutorial.solary.<categoryId>; screenshots live at
// public/tutorial/solary/<key>.png.
export const TUTORIAL_CATEGORIES_SOLARY: TutorialCategory[] = [
  { id: 'start',     stepCount: 4, alwaysCount: 2, neverCount: 2, tipCount: 1,
    shots: [{ key: 'start-header', captionKey: 'header' }] },
  { id: 'editor',    stepCount: 5, alwaysCount: 3, neverCount: 4, tipCount: 2,
    shots: [
      { key: 'editor-list',         captionKey: 'list' },
      { key: 'editor-gallery-rule', captionKey: 'galleryRule' },
      { key: 'editor-save',         captionKey: 'save' },
    ] },
  { id: 'palette',   stepCount: 3, alwaysCount: 1, neverCount: 1, tipCount: 1,
    shots: [{ key: 'palette-grid', captionKey: 'grid' }] },
  { id: 'music',     stepCount: 3, alwaysCount: 2, neverCount: 2, tipCount: 1,
    shots: [{ key: 'music-upload', captionKey: 'upload' }] },
  { id: 'rsvps',     stepCount: 2, alwaysCount: 1, neverCount: 1, tipCount: 1,
    shots: [{ key: 'rsvps-table', captionKey: 'table' }] },
  { id: 'gifts',     stepCount: 2, alwaysCount: 1, neverCount: 1, tipCount: 0,
    shots: [{ key: 'gifts-table', captionKey: 'table' }] },
  { id: 'guests',    stepCount: 3, alwaysCount: 2, neverCount: 2, tipCount: 1,
    shots: [{ key: 'guests-share', captionKey: 'share' }] },
  { id: 'guestbook', premiumOnly: true, stepCount: 2, alwaysCount: 1, neverCount: 1, tipCount: 0,
    shots: [{ key: 'guestbook-ledger', captionKey: 'ledger' }] },
]

/** Category list for a template's tutorial. Solary drops the ornament category. */
export function getTutorialCategories(template: string): TutorialCategory[] {
  return template === 'solary' ? TUTORIAL_CATEGORIES_SOLARY : TUTORIAL_CATEGORIES
}
