'use client'

import { useEditor } from './EditorProvider'
import { getSchemaRegistry } from './schemas'
import {
  getTemplatePolicy,
  isTypeLocked,
  isTypeAnchored,
  isTypeLockedFor,
  isMandatoryType,
  availableSwapTypes,
} from './templatePolicy'
import { localizeLabel, type FieldDef } from './schemas/types'
import { useDashboardDict, useDashboardLang } from '@/app/[template]/[slug]/dashboard/DashboardI18nProvider'
import { useConfirm } from '@/components/dashboard/DialogProvider'
import type { Lang } from '@/lib/i18n'
import { injectCoupleProps } from '@/lib/meta/couple'
import { isCoupleFieldLocked, shouldShowRelink, coupleSeedValues } from './lib/coupleLock'
import LockedCoupleField from './fields/LockedCoupleField'
import TextField from './fields/TextField'
import TextareaField from './fields/TextareaField'
import DatetimeField from './fields/DatetimeField'
import BooleanField from './fields/BooleanField'
import SelectField from './fields/SelectField'
import ImageField from './fields/ImageField'
import ImageArrayField from './fields/ImageArrayField'
import StringArrayField from './fields/StringArrayField'
import ObjectArrayField from './fields/ObjectArrayField'
import AudioField from './fields/AudioField'

interface Props {
  slug: string
  template: string
}

export default function FieldEditor({ slug, template }: Props) {
  const { selectedSection, updateField, removeSection, changeSectionType, config } = useEditor()
  const t = useDashboardDict().editor
  const lang = useDashboardLang()
  const confirmDialog = useConfirm()

  if (!selectedSection) {
    return <div style={empty}>{t.selectPrompt}</div>
  }

  const schema = getSchemaRegistry(template)[selectedSection.type]
  const props = (selectedSection.props || {}) as Record<string, any>

  if (!schema) {
    return (
      <div style={fallback}>
        <header style={{ borderLeft: '4px solid var(--interactive-primary)', paddingLeft: 14, marginBottom: 24 }}>
          <p style={kicker}>{t.sectionKicker}</p>
          <h3 style={h3}>{t.unknownSection}</h3>
        </header>
        <div style={legacyCard}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <span style={legacyIcon}>⚠</span>
            <div style={{ display: 'grid', gap: 10, flex: 1 }}>
              <p style={legacyTitle}>{t.legacyTitlePrefix} <code>{selectedSection.type}</code> {t.legacyTitleSuffix}</p>
              <p style={legacyDesc}>{t.legacyDesc}</p>
              <button
                type="button"
                onClick={async () => {
                  if (await confirmDialog({ message: `${t.removeConfirmPrefix}"${selectedSection.type}"${t.removeConfirmSuffix}`, tone: 'danger' })) {
                    removeSection(selectedSection.id)
                  }
                }}
                style={legacyBtn}
              >
                {t.removeThisSection}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const coupleLock = t.coupleLock
  const inheritedProps = injectCoupleProps({ type: selectedSection.type, props }, config.couple)

  async function unlockCouple() {
    const ok = await confirmDialog({
      title: coupleLock.dialogTitle,
      message: coupleLock.dialogMessage,
      confirmLabel: coupleLock.proceed,
      cancelLabel: coupleLock.cancel,
    })
    if (!ok) return
    // Seed each couple field with its current inherited value so editing starts
    // from what's on screen, then flip the override flag on.
    const seed = coupleSeedValues({ type: selectedSection!.type, props }, schema.fields, config.couple)
    Object.entries(seed).forEach(([key, value]) => updateField(selectedSection!.id, key, value))
    updateField(selectedSection!.id, 'coupleOverride', true)
  }
  function relinkCouple() {
    updateField(selectedSection!.id, 'coupleOverride', false)
  }

  const policy = getTemplatePolicy(template)
  const registry = getSchemaRegistry(template)
  const anchored = policy ? isTypeAnchored(selectedSection.type, policy) : false
  const typeLocked = policy
    ? isTypeLockedFor(selectedSection.type, policy) || isTypeLocked(selectedSection.id, policy) || isMandatoryType(selectedSection.type, policy)
    : false
  // Dedup: only offer pool types not used by other slots (current type stays first).
  const swapOptions =
    policy && !typeLocked && !anchored
      ? availableSwapTypes(registry, config.sections, policy, selectedSection.id, selectedSection.type)
      : []

  async function onChangeType(newType: string) {
    if (newType === selectedSection!.type) return
    if (!(await confirmDialog({ message: t.changeTypeConfirm }))) return
    changeSectionType(selectedSection!.id, newType, registry[newType]?.defaults)
  }

  return (
    <div style={wrap}>
      <header style={hdr}>
        <p style={kicker}>{t.sectionKicker}</p>
        <h3 style={h3}>{localizeLabel(schema.label, lang)}</h3>
        {swapOptions.length > 0 && (
          <label style={{ display: 'block', marginTop: 10 }}>
            <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'var(--text-muted)' }}>{t.changeType}</span>
            <select
              value={selectedSection.type}
              onChange={(e) => onChangeType(e.target.value)}
              style={{ display: 'block', marginTop: 6, padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-strong)', fontSize: 13, background: 'var(--surface-raised)', color: 'var(--text-primary)' }}
            >
              {swapOptions.map((tp) => (
                <option key={tp} value={tp}>{localizeLabel(registry[tp].label, lang)}</option>
              ))}
            </select>
          </label>
        )}
        {typeLocked && policy && <p style={{ marginTop: 8, fontSize: 11, color: 'rgba(42,33,24,0.45)' }}>🔒 {t.lockedHint}</p>}
      </header>
      <div style={form}>
        {schema.fields.map((f) => {
          if (isCoupleFieldLocked(f, props, config.couple)) {
            return (
              <LockedCoupleField
                key={f.key}
                label={localizeLabel(f.label, lang)}
                value={String(inheritedProps[f.key] ?? '')}
                hint={coupleLock.unlockHint}
                onUnlock={unlockCouple}
              />
            )
          }
          return renderField(f, props[f.key], (v) => updateField(selectedSection!.id, f.key, v), slug, lang)
        })}
        {shouldShowRelink(schema.fields, props, config.couple) && (
          <button type="button" onClick={relinkCouple} style={relinkBtn}>{coupleLock.relink}</button>
        )}
      </div>
    </div>
  )
}

function renderField(
  f: FieldDef,
  value: any,
  onChange: (v: unknown) => void,
  slug: string,
  lang: Lang,
) {
  const label = localizeLabel(f.label, lang)
  const help = f.help ? localizeLabel(f.help, lang) : undefined
  switch (f.type) {
    case 'text':       return <TextField     key={f.key} label={label} value={value ?? ''} onChange={(v) => onChange(v)} help={help} />
    case 'textarea':   return <TextareaField key={f.key} label={label} value={value ?? ''} rows={f.rows} onChange={(v) => onChange(v)} help={help} />
    case 'datetime':   return <DatetimeField key={f.key} label={label} value={value ?? ''} onChange={(v) => onChange(v)} help={help} />
    case 'boolean':    return <BooleanField  key={f.key} label={label} value={!!value} onChange={(v) => onChange(v)} help={help} />
    case 'select':     return <SelectField   key={f.key} label={label} value={value ?? ''} options={f.options.map((o) => ({ value: o.value, label: localizeLabel(o.label, lang) }))} onChange={(v) => onChange(v)} help={help} />
    case 'image':      return <ImageField    key={f.key} label={label} value={value ?? ''} slug={slug} onChange={(v) => onChange(v)} help={help} />
    case 'audio':      return <AudioField    key={f.key} label={label} value={value ?? ''} slug={slug} onChange={(v) => onChange(v)} help={help} />
    case 'imageArray': return <ImageArrayField key={f.key} label={label} value={Array.isArray(value) ? value : []} slug={slug} onChange={(v) => onChange(v)} help={help} maxItems={f.maxItems} />
    case 'stringArray': return <StringArrayField key={f.key} label={label} value={Array.isArray(value) ? value : []} itemPlaceholder={f.itemPlaceholder} onChange={(v) => onChange(v)} help={help} />
    case 'objectArray':return <ObjectArrayField
                                key={f.key}
                                label={label}
                                value={Array.isArray(value) ? value : []}
                                itemFields={f.itemFields}
                                newItem={f.newItem}
                                itemLabelKey={f.itemLabelKey}
                                maxItems={f.maxItems}
                                slug={slug}
                                lang={lang}
                                onChange={(v) => onChange(v)}
                              />
  }
}

const wrap: React.CSSProperties = { display: 'grid', gap: 24 }
const hdr:  React.CSSProperties = { borderLeft: '4px solid var(--interactive-primary)', paddingLeft: 14 }
const kicker:React.CSSProperties = { margin: 0, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.24em', color: 'var(--interactive-primary)' }
const h3:   React.CSSProperties = { margin: '4px 0 0', fontFamily: 'var(--font-heading)', fontStyle: 'normal', fontSize: 26 }
const form: React.CSSProperties = { display: 'grid', gap: 20, paddingBottom: 60 }
const empty:React.CSSProperties = { padding: 40, color: 'var(--text-muted)', fontSize: 14, textAlign: 'center' }
const fallback: React.CSSProperties = { display: 'grid', gap: 0 }
const legacyCard: React.CSSProperties = {
  padding: 20,
  background: 'rgba(232,85,62,0.06)',
  border: '1px solid var(--interactive-primary-soft)',
  borderRadius: 'var(--radius-md)',
}
const legacyIcon: React.CSSProperties = {
  width: 36, height: 36, borderRadius: '50%',
  background: 'var(--interactive-primary-soft)', color: 'var(--interactive-primary-hover)',
  display: 'grid', placeItems: 'center',
  fontSize: 18, fontWeight: 700, flexShrink: 0,
}
const legacyTitle: React.CSSProperties = { margin: 0, fontSize: 15, color: 'var(--text-primary)', fontWeight: 500 }
const legacyDesc: React.CSSProperties = { margin: 0, fontSize: 13, color: 'rgba(42,33,24,0.65)', lineHeight: 1.55 }
const legacyBtn: React.CSSProperties = {
  justifySelf: 'start', marginTop: 4,
  padding: '10px 18px', borderRadius: 'var(--radius-pill)',
  background: 'var(--interactive-primary-hover)', color: '#fff', border: 'none',
  fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase',
  fontWeight: 500, cursor: 'pointer',
}
const relinkBtn: React.CSSProperties = {
  justifySelf: 'start',
  padding: '8px 14px',
  borderRadius: 'var(--radius-pill)',
  border: '1px solid var(--border-strong)',
  background: 'transparent',
  color: 'var(--text-primary)',
  fontSize: 11,
  letterSpacing: '0.08em',
  cursor: 'pointer',
}
