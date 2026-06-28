'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from 'react'
import { deepEqual } from './lib/deepEqual'
import { useDashboardDict } from '@/app/[template]/[slug]/dashboard/DashboardI18nProvider'
import { useFeedback } from '@/components/dashboard/FeedbackProvider'
import { broadcastEditorSave, subscribeEditorSaves } from './lib/editorSync'
import { hashSections } from './lib/sectionsHash'

export interface SectionEntry {
  id: string
  type: string
  enabled?: boolean
  theme?: string
  navLabel?: string
  background?: { type: string; value: string }
  layout?: string
  props?: Record<string, unknown>
  blocks?: unknown[]
  decorativeLayers?: unknown[]
}

export interface MusicSettings {
  url?: string
  enabled?: boolean
  title?: string
  subtitle?: string
  acceptLabel?: string
  dismissLabel?: string
  loop?: boolean
}

export interface PageConfig {
  meta?: { title?: string; description?: string }
  couple?: { name1?: string; name2?: string }
  music?: MusicSettings
  /** URL untuk GIF background (mis. burung) — diatur lewat dashboard tab
   *  Background. Kosong string ('') berarti user sengaja menghapus GIF. */
  bgGif?: string
  sections: SectionEntry[]
}

export interface State {
  config: PageConfig
  initialConfig: PageConfig
  selectedSectionId: string | null
  isSaving: boolean
  saveError: string | null
  lastSavedAt: string | null
  /** Fingerprint of the SECTIONS this editor last loaded/saved — the
   *  optimistic-concurrency baseline sent on save. Only bumps when sections are
   *  saved here, so sibling sub-tab saves (palette/music/meta) never invalidate
   *  it. See lib/sectionsHash. */
  baseSectionsHash: string
}

export type Action =
  | { type: 'UPDATE_FIELD';        sectionId: string; key: string; value: unknown }
  | { type: 'UPDATE_ARRAY_ITEM';   sectionId: string; key: string; index: number; subKey: string; value: unknown }
  | { type: 'ADD_ARRAY_ITEM';      sectionId: string; key: string; item: unknown }
  | { type: 'REMOVE_ARRAY_ITEM';   sectionId: string; key: string; index: number }
  | { type: 'REORDER_ARRAY_ITEMS'; sectionId: string; key: string; from: number; to: number }
  | { type: 'REORDER_SECTIONS';    from: number; to: number }
  | { type: 'TOGGLE_SECTION_ENABLED'; sectionId: string }
  | { type: 'RENAME_SECTION_NAV';     sectionId: string; navLabel: string }
  | { type: 'ADD_SECTION';            sectionType: string; label: string; defaults?: Record<string, unknown> }
  | { type: 'REMOVE_SECTION';         sectionId: string }
  | { type: 'SELECT_SECTION';         sectionId: string }
  | { type: 'SAVE_START' }
  | { type: 'SAVE_SUCCESS';           savedAt: string; sectionsHash: string }
  | { type: 'SAVE_ERROR';             message: string | null }
  | { type: 'REBASE';                 savedAt: string }
  | { type: 'CHANGE_SECTION_TYPE'; sectionId: string; newType: string; defaults?: Record<string, unknown> }
  | { type: 'REORDER_SECTIONS_BY_ID'; order: string[] }
  | { type: 'UPDATE_COUPLE'; key: 'name1' | 'name2'; value: string }

function moveItem<T>(arr: T[], from: number, to: number): T[] {
  const next = arr.slice()
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

function patchSection(
  config: PageConfig,
  sectionId: string,
  patch: (s: SectionEntry) => SectionEntry,
): PageConfig {
  return {
    ...config,
    sections: config.sections.map((s) => (s.id === sectionId ? patch(s) : s)),
  }
}

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'UPDATE_FIELD':
      return {
        ...state,
        config: patchSection(state.config, action.sectionId, (s) => ({
          ...s,
          props: { ...(s.props || {}), [action.key]: action.value },
        })),
      }

    case 'UPDATE_COUPLE':
      return {
        ...state,
        config: { ...state.config, couple: { ...(state.config.couple || {}), [action.key]: action.value } },
      }

    case 'UPDATE_ARRAY_ITEM':
      return {
        ...state,
        config: patchSection(state.config, action.sectionId, (s) => {
          const arr = ((s.props?.[action.key] as unknown[]) || []).slice()
          const item = { ...(arr[action.index] as Record<string, unknown>) }
          item[action.subKey] = action.value
          arr[action.index] = item
          return { ...s, props: { ...(s.props || {}), [action.key]: arr } }
        }),
      }

    case 'ADD_ARRAY_ITEM':
      return {
        ...state,
        config: patchSection(state.config, action.sectionId, (s) => {
          const arr = ((s.props?.[action.key] as unknown[]) || []).slice()
          arr.push(action.item)
          return { ...s, props: { ...(s.props || {}), [action.key]: arr } }
        }),
      }

    case 'REMOVE_ARRAY_ITEM':
      return {
        ...state,
        config: patchSection(state.config, action.sectionId, (s) => {
          const arr = ((s.props?.[action.key] as unknown[]) || []).slice()
          arr.splice(action.index, 1)
          return { ...s, props: { ...(s.props || {}), [action.key]: arr } }
        }),
      }

    case 'REORDER_ARRAY_ITEMS':
      return {
        ...state,
        config: patchSection(state.config, action.sectionId, (s) => {
          const arr = (s.props?.[action.key] as unknown[]) || []
          return {
            ...s,
            props: { ...(s.props || {}), [action.key]: moveItem(arr, action.from, action.to) },
          }
        }),
      }

    case 'REORDER_SECTIONS':
      return {
        ...state,
        config: { ...state.config, sections: moveItem(state.config.sections, action.from, action.to) },
      }

    case 'CHANGE_SECTION_TYPE':
      return {
        ...state,
        config: patchSection(state.config, action.sectionId, (s) => {
          const prev = (s.props || {}) as Record<string, unknown>
          const defaults = (action.defaults || {}) as Record<string, unknown>
          // Solary planets are POSITIONAL — planetKey/planetName are the physical
          // celestial body framed by the 3D camera at this slot, so they stay.
          // Everything else (sectionLabel, navLabel, content) adopts the new
          // type, otherwise a swap "Bridal Party"→"Quote" keeps showing the old
          // name on the card and in the nav.
          const preserved: Record<string, unknown> = {}
          if (prev.planetKey !== undefined) preserved.planetKey = prev.planetKey
          if (prev.planetName !== undefined) preserved.planetName = prev.planetName
          const GALLERY_TYPES = new Set(['galleryMasonry', 'gallerySpringCoil'])
          if (GALLERY_TYPES.has(s.type) && GALLERY_TYPES.has(action.newType) && Array.isArray(prev.photos)) {
            // masonry uses {src, alt}; spring-coil uses {src, caption}. Map both so
            // the caption text survives in either direction.
            preserved.photos = (prev.photos as Array<Record<string, unknown>>).map((p) => {
              const text = (p.alt ?? p.caption ?? '') as string
              return { src: p.src ?? '', alt: text, caption: text }
            })
          }
          // navLabel: clear so lovebirds re-derives from its per-type default
          // label map; solary has no such map, so seed it from the new type's
          // sectionLabel default so the floating nav updates too.
          const navLabel =
            typeof defaults.sectionLabel === 'string' ? (defaults.sectionLabel as string) : undefined
          return {
            ...s,
            type: action.newType,
            navLabel,
            props: { ...defaults, ...preserved },
          }
        }),
      }

    case 'REORDER_SECTIONS_BY_ID': {
      const byId = new Map(state.config.sections.map((s) => [s.id, s]))
      const next = action.order
        .map((id) => byId.get(id))
        .filter((s): s is SectionEntry => !!s)
      // Guard: only apply if it's a pure permutation (same length).
      if (next.length !== state.config.sections.length) return state
      return { ...state, config: { ...state.config, sections: next } }
    }

    case 'TOGGLE_SECTION_ENABLED':
      return {
        ...state,
        config: patchSection(state.config, action.sectionId, (s) => ({
          ...s,
          enabled: !s.enabled,
        })),
      }

    case 'RENAME_SECTION_NAV': {
      // Trim, collapse spaces, take up to 4 words, cap at 40 chars.
      const cleaned = action.navLabel
        .trim()
        .replace(/\s+/g, ' ')
        .split(' ')
        .slice(0, 4)
        .join(' ')
        .slice(0, 40)
      return {
        ...state,
        config: patchSection(state.config, action.sectionId, (s) => ({
          ...s,
          navLabel: cleaned || undefined,
        })),
      }
    }

    case 'ADD_SECTION': {
      const id = `${action.sectionType}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      const newSection: SectionEntry = {
        id,
        type: action.sectionType,
        enabled: true,
        props: { ...(action.defaults || {}) },
      }
      return {
        ...state,
        config: { ...state.config, sections: [...state.config.sections, newSection] },
        selectedSectionId: id,
      }
    }

    case 'REMOVE_SECTION': {
      const sections = state.config.sections.filter((s) => s.id !== action.sectionId)
      const selectedSectionId =
        state.selectedSectionId === action.sectionId
          ? sections[0]?.id ?? null
          : state.selectedSectionId
      return { ...state, config: { ...state.config, sections }, selectedSectionId }
    }

    case 'SELECT_SECTION':
      return { ...state, selectedSectionId: action.sectionId }

    case 'SAVE_START':
      return { ...state, isSaving: true, saveError: null }

    case 'SAVE_SUCCESS':
      return {
        ...state,
        isSaving: false,
        saveError: null,
        initialConfig: state.config,
        lastSavedAt: action.savedAt,
        // Sections we just stored are the new concurrency baseline.
        baseSectionsHash: action.sectionsHash,
      }

    case 'SAVE_ERROR':
      return { ...state, isSaving: false, saveError: action.message }

    // Advance the concurrency baseline to a newer save made by a SIBLING tab
    // (palette/music/meta/ornament) of the same invitation. Those touch only
    // keys this save preserves, so adopting their timestamp lets the next save
    // through instead of false-tripping the 409 guard. Never moves backward,
    // and leaves config/initialConfig (i.e. the dirty state) untouched.
    case 'REBASE': {
      const cur = state.lastSavedAt ? Date.parse(state.lastSavedAt) : NaN
      const next = Date.parse(action.savedAt)
      if (!Number.isNaN(cur) && !Number.isNaN(next) && next <= cur) return state
      return { ...state, lastSavedAt: action.savedAt }
    }

    default:
      return state
  }
}

interface EditorContextValue extends State {
  isDirty: boolean
  selectedSection: SectionEntry | null
  updateField: (sectionId: string, key: string, value: unknown) => void
  updateCouple: (key: 'name1' | 'name2', value: string) => void
  updateArrayItem: (sectionId: string, key: string, index: number, subKey: string, value: unknown) => void
  addArrayItem: (sectionId: string, key: string, item: unknown) => void
  removeArrayItem: (sectionId: string, key: string, index: number) => void
  reorderArrayItems: (sectionId: string, key: string, from: number, to: number) => void
  reorderSections: (from: number, to: number) => void
  toggleSectionEnabled: (sectionId: string) => void
  renameSectionNav: (sectionId: string, navLabel: string) => void
  addSection: (sectionType: string, label: string, defaults?: Record<string, unknown>) => void
  removeSection: (sectionId: string) => void
  selectSection: (sectionId: string) => void
  save: () => Promise<void>
  changeSectionType: (sectionId: string, newType: string, defaults?: Record<string, unknown>) => void
  reorderSectionsById: (order: string[]) => void
  /** Publish toggle lives here (not in SaveBar) so multiple save bars share it. */
  isPublished: boolean
  publishBusy: boolean
  publishError: string | null
  togglePublish: () => Promise<void>
  /**
   * True when another tab/device has newer SECTION content than this tab — either
   * learned live via BroadcastChannel, or discovered when a save came back 409.
   * Surfaces the gentle, non-blocking "reload for the latest" banner (no blocking
   * modal, no "close your other tabs" scolding). Reload is the only resolution.
   */
  remoteChange: boolean
  dismissRemoteChange: () => void
}

const EditorContext = createContext<EditorContextValue | null>(null)

export function useEditor(): EditorContextValue {
  const ctx = useContext(EditorContext)
  if (!ctx) throw new Error('useEditor must be used inside <EditorProvider>')
  return ctx
}

interface ProviderProps {
  slug: string
  initialConfig: PageConfig
  children: ReactNode
  /** invitation.updated_at at load — kept for the "Saved HH:MM" display only. */
  initialUpdatedAt?: string | null
  /**
   * Fingerprint of the sections as STORED when the page loaded (hashed from the
   * raw, pre-migration config so it matches what the server will compute). The
   * optimistic-concurrency baseline; computed in EditorRoot.
   */
  initialSectionsHash?: string
  /** Published state at load — owned here so every SaveBar instance agrees. */
  initialIsPublished?: boolean
  /**
   * Live row timestamp owned by EditorWorkspace and bumped whenever a SIBLING
   * sub-tab (palette/music/meta/ornament) saves in THIS tab. The section editor
   * stays mounted across sub-tab switches, so without this its baseline would go
   * stale the moment a sibling saved — and the next section save would false-409.
   * Those saves only touch keys the section save preserves, so advancing the
   * baseline to them is safe (no clobber).
   */
  liveUpdatedAt?: string | null
  /** Called with the real stored updated_at after a successful section save, so
   *  EditorWorkspace can keep the shared baseline in sync for the other sub-tabs. */
  onSaved?: (savedAt: string) => void
}

// Section types that used to exist but were removed/moved. Stripped on
// EditorProvider init so users never see orphan rows in the editor.
//   • musicPopup → moved to the dashboard "Music" tab
const DEPRECATED_SECTION_TYPES = new Set<string>(['musicPopup'])

function cleanConfig(input: PageConfig): PageConfig {
  return {
    ...input,
    sections: (input.sections || []).filter(
      (s) => s && !DEPRECATED_SECTION_TYPES.has(s.type),
    ),
  }
}

export function EditorProvider({ slug, initialConfig, children, initialUpdatedAt, initialSectionsHash, initialIsPublished, liveUpdatedAt, onSaved }: ProviderProps) {
  const fm = useDashboardDict().feedback
  const fb = useFeedback()
  const cleaned = cleanConfig(initialConfig)
  const [state, dispatch] = useReducer(reducer, {
    config: cleaned,
    initialConfig: cleaned,
    selectedSectionId: cleaned.sections[0]?.id ?? null,
    isSaving: false,
    saveError: null,
    lastSavedAt: initialUpdatedAt ?? null,
    // Prefer the baseline EditorRoot hashed from the raw (pre-migration) config
    // so it matches the server's stored sections; fall back to the cleaned ones.
    baseSectionsHash: initialSectionsHash ?? hashSections(cleaned.sections),
  })

  // Publish toggle + save-conflict flag live in the provider (not SaveBar) so a
  // top and a bottom SaveBar render the same state.
  const [isPublished, setIsPublished] = useState(!!initialIsPublished)
  const [publishBusy, setPublishBusy] = useState(false)
  const [publishError, setPublishError] = useState<string | null>(null)

  // A newer SECTION version exists in another tab/device of this same invitation
  // — learned live via BroadcastChannel, or discovered when our own save came
  // back 409. Surfaces the gentle, non-blocking "reload for the latest" banner.
  const [remoteChange, setRemoteChange] = useState(false)
  const dismissRemoteChange = useCallback(() => setRemoteChange(false), [])

  // Listen for saves from OTHER browser tabs of the same invitation.
  useEffect(() => {
    return subscribeEditorSaves(slug, (sig) => {
      if (sig.surface === 'section') {
        // Another content editor wrote — real conflict; warn this tab.
        setRemoteChange(true)
      } else {
        // A sub-tab (palette/music/meta/ornament) wrote keys this editor
        // preserves on save — just move our baseline forward so the next save
        // isn't falsely rejected.
        dispatch({ type: 'REBASE', savedAt: sig.savedAt })
      }
    })
  }, [slug])

  // SAME-tab sibling saves: EditorWorkspace bumps `liveUpdatedAt` when the
  // palette/music/meta/ornament sub-tab saves. The section editor stays mounted
  // across sub-tab switches, so rebase its baseline forward to match — those
  // saves touch only preserved keys, so this can't clobber section content.
  useEffect(() => {
    if (liveUpdatedAt) dispatch({ type: 'REBASE', savedAt: liveUpdatedAt })
  }, [liveUpdatedAt])

  const togglePublish = useCallback(async () => {
    const next = !isPublished
    setPublishBusy(true)
    setPublishError(null)
    try {
      const res = await fetch(`/api/invitation/${slug}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_published: next }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setPublishError(err.error || `HTTP ${res.status}`)
        fb.fail(fm.publishFail)
        return
      }
      setIsPublished(next)
      fb.ok(next ? fm.published : fm.setToDraft)
    } finally {
      setPublishBusy(false)
    }
  }, [isPublished, slug, fb, fm])

  const isDirty = useMemo(() => !deepEqual(state.config, state.initialConfig), [state.config, state.initialConfig])

  const selectedSection = useMemo(
    () => state.config.sections.find((s) => s.id === state.selectedSectionId) ?? null,
    [state.config.sections, state.selectedSectionId],
  )

  // Beforeunload guard while dirty.
  useEffect(() => {
    if (!isDirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  const save = useCallback(async () => {
    dispatch({ type: 'SAVE_START' })
    try {
      const res = await fetch(`/api/invitation/${slug}/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        // baseSectionsHash lets the server reject a save that would clobber newer
        // SECTION content written from another tab/device since this one loaded.
        // (Sibling sub-tab saves don't touch sections, so they never trip it.)
        body: JSON.stringify({ config: state.config, baseSectionsHash: state.baseSectionsHash }),
      })
      if (!res.ok) {
        if (res.status === 409) {
          // Another tab/device saved newer SECTION content. Don't scold with a
          // blocking modal — raise the same gentle reload banner the live notice
          // uses, and keep the user's unsaved edits in place. No fail toast.
          dispatch({ type: 'SAVE_ERROR', message: null })
          setRemoteChange(true)
          return
        }
        const err = await res.json().catch(() => ({}))
        dispatch({ type: 'SAVE_ERROR', message: err.error || `HTTP ${res.status}` })
        fb.fail(fm.saveFail)
        return
      }
      const data = await res.json()
      const savedAt = data.savedAt || new Date().toISOString()
      // Adopt the server's authoritative sections fingerprint as the next
      // baseline; recompute locally if an older server didn't echo one.
      const sectionsHash = typeof data.sectionsHash === 'string'
        ? data.sectionsHash
        : hashSections(state.config.sections)
      dispatch({ type: 'SAVE_SUCCESS', savedAt, sectionsHash })
      // Keep EditorWorkspace's shared baseline in sync for the sibling sub-tabs.
      onSaved?.(savedAt)
      // Tell other tabs of this invitation a SECTION write just landed, so a
      // stale content editor elsewhere can prompt a reload.
      broadcastEditorSave(slug, 'section', savedAt)
      fb.ok(fm.changesSaved)
    } catch (e: any) {
      dispatch({ type: 'SAVE_ERROR', message: e?.message || 'Network error' })
      fb.fail(fm.saveFail)
    }
  }, [slug, state.config, state.baseSectionsHash, fb, fm, onSaved])

  const value: EditorContextValue = {
    ...state,
    isDirty,
    selectedSection,
    updateField: (sectionId, key, value) =>
      dispatch({ type: 'UPDATE_FIELD', sectionId, key, value }),
    updateCouple: (key, value) => dispatch({ type: 'UPDATE_COUPLE', key, value }),
    updateArrayItem: (sectionId, key, index, subKey, value) =>
      dispatch({ type: 'UPDATE_ARRAY_ITEM', sectionId, key, index, subKey, value }),
    addArrayItem: (sectionId, key, item) =>
      dispatch({ type: 'ADD_ARRAY_ITEM', sectionId, key, item }),
    removeArrayItem: (sectionId, key, index) =>
      dispatch({ type: 'REMOVE_ARRAY_ITEM', sectionId, key, index }),
    reorderArrayItems: (sectionId, key, from, to) =>
      dispatch({ type: 'REORDER_ARRAY_ITEMS', sectionId, key, from, to }),
    reorderSections: (from, to) => dispatch({ type: 'REORDER_SECTIONS', from, to }),
    toggleSectionEnabled: (sectionId) =>
      dispatch({ type: 'TOGGLE_SECTION_ENABLED', sectionId }),
    renameSectionNav: (sectionId, navLabel) =>
      dispatch({ type: 'RENAME_SECTION_NAV', sectionId, navLabel }),
    addSection: (sectionType, label, defaults) =>
      dispatch({ type: 'ADD_SECTION', sectionType, label, defaults }),
    removeSection: (sectionId) => dispatch({ type: 'REMOVE_SECTION', sectionId }),
    selectSection: (sectionId) => dispatch({ type: 'SELECT_SECTION', sectionId }),
    save,
    changeSectionType: (sectionId, newType, defaults) =>
      dispatch({ type: 'CHANGE_SECTION_TYPE', sectionId, newType, defaults }),
    reorderSectionsById: (order) => dispatch({ type: 'REORDER_SECTIONS_BY_ID', order }),
    isPublished,
    publishBusy,
    publishError,
    togglePublish,
    remoteChange,
    dismissRemoteChange,
  }

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>
}
