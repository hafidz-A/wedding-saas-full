'use client'

import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useEditor } from './EditorProvider'
import { getSchemaRegistry } from './schemas'
import { getTemplatePolicy, computeSafeOrder, isTypeAnchored, isTypeLockedFor, isMandatoryType, canAddSections, canRemoveSectionType } from './templatePolicy'
import { localizeLabel } from './schemas/types'
import SectionRow from './SectionRow'
import AddSectionMenu from './AddSectionMenu'
import { useDashboardDict, useDashboardLang } from '@/app/[template]/[slug]/dashboard/DashboardI18nProvider'

interface Props {
  slug: string
  template: string
}

export default function SectionList({ slug, template }: Props) {
  const {
    config, selectedSectionId,
    reorderSections, reorderSectionsById,
    toggleSectionEnabled, selectSection, addSection, removeSection,
  } = useEditor()
  const policy = getTemplatePolicy(template)
  const t = useDashboardDict().editor
  const lang = useDashboardLang()

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return

    // Lovebirds: anchored-by-type model — anchors (hero/footer) can't move and
    // the dropped slot is clamped to stay between them.
    if (policy && (policy.anchorFirstType || policy.anchorLastType)) {
      const order = config.sections
      const from = order.findIndex((s) => s.id === active.id)
      let to = order.findIndex((s) => s.id === over.id)
      if (from < 0 || to < 0) return
      if (isTypeAnchored(order[from].type, policy)) return
      if (isMandatoryType(order[from].type, policy)) return
      const firstFree = order.findIndex((s) => !isTypeAnchored(s.type, policy))
      const lastFree =
        order.length - 1 - [...order].reverse().findIndex((s) => !isTypeAnchored(s.type, policy))
      to = Math.max(firstFree, Math.min(lastFree, to))
      if (from === to) return
      const tentative = order.slice()
      const [moved] = tentative.splice(from, 1)
      tentative.splice(to, 0, moved)
      const shiftsMandatory = order.some(
        (s, i) => isMandatoryType(s.type, policy) && tentative.findIndex((t) => t.id === s.id) !== i,
      )
      if (shiftsMandatory) return
      reorderSections(from, to)
      return
    }

    // Solary: id-based locks.
    if (policy) {
      const order = config.sections.map((s) => s.id)
      const next = computeSafeOrder(order, String(active.id), String(over.id), policy, config.sections)
      if (next) reorderSectionsById(next)
      return
    }

    const from = config.sections.findIndex((s) => s.id === active.id)
    const to = config.sections.findIndex((s) => s.id === over.id)
    if (from < 0 || to < 0) return
    reorderSections(from, to)
  }

  return (
    <aside style={wrap}>
      <header style={hdr}>
        <p style={kicker}>{t.sectionsHeader}</p>
      </header>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={config.sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <div style={list}>
            {config.sections.map((s) => {
              const lock = policy?.locks[s.id]
              const posLocked = !!lock?.lockPosition
              const disableLocked = !!lock?.lockDisable
              const typeAnchored = policy ? isTypeAnchored(s.type, policy) : false
              const typeLocked = policy ? isTypeLockedFor(s.type, policy) : false
              const mandatory = policy ? isMandatoryType(s.type, policy) : false
              return (
                <SectionRow
                  key={s.id}
                  section={s}
                  label={localizeLabel(getSchemaRegistry(template)[s.type]?.label ?? s.type, lang)}
                  isSelected={s.id === selectedSectionId}
                  onSelect={() => selectSection(s.id)}
                  onToggleEnabled={() => toggleSectionEnabled(s.id)}
                  onRemove={() => removeSection(s.id)}
                  draggable={!posLocked && !typeAnchored && !mandatory}
                  canRemove={canRemoveSectionType(s.type, policy)}
                  canDisable={!disableLocked && !typeLocked && !mandatory}
                />
              )
            })}
          </div>
        </SortableContext>
      </DndContext>

      {canAddSections(policy) && (
        <div style={{ padding: 12 }}>
          <AddSectionMenu
            template={template}
            onAdd={(type, label, defaults) => addSection(type, label, defaults)}
          />
        </div>
      )}

      <footer style={ftr}>
        <a
          href={`/${template}/${slug}?preview=1`}
          target="_blank"
          rel="noopener noreferrer"
          style={previewLink}
        >
          {t.openPreview}
        </a>
      </footer>
    </aside>
  )
}

/* Width + border come from the parent (.sectionList in EditorRoot.module.css)
   so this aside stays responsive. We just need flex column layout. */
const wrap: React.CSSProperties = { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: 'transparent' }
const hdr:  React.CSSProperties = { padding: '18px 16px 8px' }
const kicker:React.CSSProperties = { margin: 0, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.24em', color: '#E8553E' }
const list: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4, padding: '4px 8px', flex: 1, overflow: 'auto' }
const ftr:  React.CSSProperties = { padding: 12, borderTop: '1px solid rgba(42,33,24,0.08)' }
const previewLink: React.CSSProperties = { display: 'block', textAlign: 'center', padding: '10px 14px', borderRadius: 10, background: '#2A2118', color: '#F5EFE3', fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', textDecoration: 'none' }
