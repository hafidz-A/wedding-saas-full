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
  | { type: 'SAVE_SUCCESS';           savedAt: string }
  | { type: 'SAVE_ERROR';             message: string }
  | { type: 'CHANGE_SECTION_TYPE'; sectionId: string; newType: string; defaults?: Record<string, unknown> }
  | { type: 'REORDER_SECTIONS_BY_ID'; order: string[] }

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
      }

    case 'SAVE_ERROR':
      return { ...state, isSaving: false, saveError: action.message }

    default:
      return state
  }
}

interface EditorContextValue extends State {
  isDirty: boolean
  selectedSection: SectionEntry | null
  updateField: (sectionId: string, key: string, value: unknown) => void
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
  /** True once a save was rejected with 409 (another tab/device wrote first). */
  saveConflict: boolean
  clearSaveConflict: () => void
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
  /** invitation.updated_at at load — sent back on save for conflict detection. */
  initialUpdatedAt?: string | null
  /** Published state at load — owned here so every SaveBar instance agrees. */
  initialIsPublished?: boolean
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

export function EditorProvider({ slug, initialConfig, children, initialUpdatedAt, initialIsPublished }: ProviderProps) {
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
  })

  // Publish toggle + save-conflict flag live in the provider (not SaveBar) so a
  // top and a bottom SaveBar render the same state.
  const [isPublished, setIsPublished] = useState(!!initialIsPublished)
  const [publishBusy, setPublishBusy] = useState(false)
  const [publishError, setPublishError] = useState<string | null>(null)
  const [saveConflict, setSaveConflict] = useState(false)
  const clearSaveConflict = useCallback(() => setSaveConflict(false), [])

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
        // baseUpdatedAt lets the server reject a save that would clobber a newer
        // version written from another tab/device since this one loaded.
        body: JSON.stringify({ config: state.config, baseUpdatedAt: state.lastSavedAt }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        dispatch({ type: 'SAVE_ERROR', message: err.error || `HTTP ${res.status}` })
        // 409 = another tab/device saved since this one loaded. Raise a flag the
        // SaveBar turns into a "muat ulang halaman" dialog (vs the generic toast).
        if (res.status === 409) setSaveConflict(true)
        else fb.fail(fm.saveFail)
        return
      }
      const data = await res.json()
      dispatch({ type: 'SAVE_SUCCESS', savedAt: data.savedAt || new Date().toISOString() })
      fb.ok(fm.changesSaved)
    } catch (e: any) {
      dispatch({ type: 'SAVE_ERROR', message: e?.message || 'Network error' })
      fb.fail(fm.saveFail)
    }
  }, [slug, state.config, fb, fm])

  const value: EditorContextValue = {
    ...state,
    isDirty,
    selectedSection,
    updateField: (sectionId, key, value) =>
      dispatch({ type: 'UPDATE_FIELD', sectionId, key, value }),
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
    saveConflict,
    clearSaveConflict,
  }

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>
}
