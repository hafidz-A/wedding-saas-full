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
import { schemaRegistry } from './schemas'
import SectionRow from './SectionRow'
import AddSectionMenu from './AddSectionMenu'

interface Props {
  slug: string
  template: string
}

export default function SectionList({ slug, template }: Props) {
  const {
    config, selectedSectionId,
    reorderSections, toggleSectionEnabled, selectSection, addSection, removeSection,
  } = useEditor()

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const from = config.sections.findIndex((s) => s.id === active.id)
    const to = config.sections.findIndex((s) => s.id === over.id)
    if (from < 0 || to < 0) return
    reorderSections(from, to)
  }

  return (
    <aside style={wrap}>
      <header style={hdr}>
        <p style={kicker}>Sections</p>
      </header>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={config.sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <div style={list}>
            {config.sections.map((s) => (
              <SectionRow
                key={s.id}
                section={s}
                label={schemaRegistry[s.type]?.label ?? s.type}
                isSelected={s.id === selectedSectionId}
                onSelect={() => selectSection(s.id)}
                onToggleEnabled={() => toggleSectionEnabled(s.id)}
                onRemove={() => removeSection(s.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <div style={{ padding: 12 }}>
        <AddSectionMenu onAdd={(type, label) => addSection(type, label)} />
      </div>

      <footer style={ftr}>
        <a
          href={`/${template}/${slug}?preview=1`}
          target="_blank"
          rel="noopener noreferrer"
          style={previewLink}
        >
          Open preview ↗
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
const list: React.CSSProperties = { display: 'grid', gap: 4, padding: '4px 8px', flex: 1, overflow: 'auto' }
const ftr:  React.CSSProperties = { padding: 12, borderTop: '1px solid rgba(42,33,24,0.08)' }
const previewLink: React.CSSProperties = { display: 'block', textAlign: 'center', padding: '10px 14px', borderRadius: 10, background: '#2A2118', color: '#F5EFE3', fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', textDecoration: 'none' }
