// src/app/admin/templates/TemplateEditor.tsx
'use client'

import { useState } from 'react'
import { CATEGORIES } from '@/config/categories'
import { updateTemplate } from './actions'
import type { TemplateDisplay } from '@/lib/templates/display'
import { Button } from '@/components/ui/Button'
import { useFeedback } from '@/components/ui/FeedbackProvider'

/**
 * "Tampilan" editor for one template — enable/disable + display metadata + the
 * bilingual marketing copy shown on the landing card. Thumbnail is a URL/path
 * (the media-upload endpoint is scoped to invitation owners, not admin assets).
 */
export default function TemplateEditor({ templateId, initial }: { templateId: string; initial: TemplateDisplay }) {
  const [enabled, setEnabled] = useState(initial.enabled)
  const [label, setLabel] = useState(initial.label)
  const [category, setCategory] = useState(initial.category)
  const [tags, setTags] = useState(initial.tags.join(', '))
  const [accent, setAccent] = useState(initial.accent || '#E8553E')
  const [thumbnail, setThumbnail] = useState(initial.thumbnail || '')
  const [sortOrder, setSortOrder] = useState(String(initial.sortOrder))
  const [taglineId, setTaglineId] = useState(initial.taglineId)
  const [taglineEn, setTaglineEn] = useState(initial.taglineEn)
  const [blurbId, setBlurbId] = useState(initial.blurbId)
  const [blurbEn, setBlurbEn] = useState(initial.blurbEn)
  const [busy, setBusy] = useState(false)
  const fb = useFeedback()

  async function save() {
    setBusy(true)
    const res = await updateTemplate(templateId, {
      enabled, label, category,
      tags: tags.split(',').map((s) => s.trim()).filter(Boolean),
      accent, thumbnail, sort_order: parseInt(sortOrder || '0', 10) || 0,
      tagline_id: taglineId, tagline_en: taglineEn, blurb_id: blurbId, blurb_en: blurbEn,
    })
    setBusy(false)
    res.ok ? fb.ok('Tersimpan') : fb.fail(res.error || 'Gagal')
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-start' }}>
      {/* form */}
      <div style={{ flex: 1, minWidth: 320, display: 'grid', gap: 12 }}>
        <label style={row}>
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          <span><strong>Aktif</strong> — tampil di halaman depan &amp; pilihan onboarding. {enabled ? '' : '(nonaktif: undangan yang sudah ada tetap jalan)'}</span>
        </label>

        <Row>
          <Field label="Nama"><input value={label} onChange={(e) => setLabel(e.target.value)} style={input} /></Field>
          <Field label="Kategori">
            <select value={category} onChange={(e) => setCategory(e.target.value)} style={input}>
              {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label.id}</option>)}
            </select>
          </Field>
          <Field label="Urutan"><input type="number" min={0} value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} style={{ ...input, width: 80 }} /></Field>
        </Row>

        <Row>
          <Field label="Warna aksen (kartu)">
            <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
              <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(accent) ? accent : '#E8553E'} onChange={(e) => setAccent(e.target.value)} style={{ width: 40, height: 34, padding: 0, border: 'none', background: 'none' }} />
              <input value={accent} onChange={(e) => setAccent(e.target.value)} style={{ ...input, width: 110 }} />
            </span>
          </Field>
          <Field label="Tags (pisah koma)"><input value={tags} onChange={(e) => setTags(e.target.value)} style={input} /></Field>
        </Row>

        <Field label="Thumbnail (URL / path)"><input value={thumbnail} onChange={(e) => setThumbnail(e.target.value)} placeholder="/images/templates/…jpg" style={input} /></Field>

        <Row>
          <Field label="Tagline (ID)"><input value={taglineId} onChange={(e) => setTaglineId(e.target.value)} style={input} /></Field>
          <Field label="Tagline (EN)"><input value={taglineEn} onChange={(e) => setTaglineEn(e.target.value)} style={input} /></Field>
        </Row>
        <Row>
          <Field label="Deskripsi (ID)"><textarea value={blurbId} onChange={(e) => setBlurbId(e.target.value)} rows={2} style={{ ...input, height: 'auto', padding: 8 }} /></Field>
          <Field label="Deskripsi (EN)"><textarea value={blurbEn} onChange={(e) => setBlurbEn(e.target.value)} rows={2} style={{ ...input, height: 'auto', padding: 8 }} /></Field>
        </Row>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Button size="sm" disabled={busy} onClick={save}>{busy ? 'Menyimpan…' : 'Simpan Tampilan'}</Button>
        </div>
      </div>

      {/* live preview card */}
      <div style={{ width: 220, border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', overflow: 'hidden', opacity: enabled ? 1 : 0.5 }}>
        <div style={{ height: 110, background: thumbnail ? `center/cover no-repeat url("${thumbnail}")` : 'var(--surface-sunken, #eee)' }} />
        <div style={{ padding: 12, borderTop: `3px solid ${/^#[0-9a-fA-F]{3,6}$/.test(accent) ? accent : '#E8553E'}` }}>
          <div style={{ fontWeight: 600 }}>{label}{!enabled && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}> · nonaktif</span>}</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{taglineId || taglineEn}</div>
          <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.4 }}>{blurbId || blurbEn}</div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'grid', gap: 4, flex: 1, minWidth: 130 }}>
      <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>{label}</span>
      {children}
    </label>
  )
}
function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>{children}</div>
}

const input: React.CSSProperties = { height: 36, padding: '0 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)', background: 'var(--surface-raised)', color: 'var(--text-primary)', fontSize: 14, width: '100%', boxSizing: 'border-box' }
const row: React.CSSProperties = { display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13, color: 'var(--text-secondary)' }
