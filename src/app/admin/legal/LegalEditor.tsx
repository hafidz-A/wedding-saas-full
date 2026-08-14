'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAdminConfirm } from '@/components/admin/AdminDialogProvider'
import { useFeedback } from '@/components/ui/FeedbackProvider'
import { Button } from '@/components/ui/Button'
import RichTextEditor from './RichTextEditor'
import { saveLegalDoc, resetLegalDoc, getDefaultLegalHtml } from './actions'
import { LEGAL_DOC_TYPES, DEFAULT_REVISED_ISO, type LegalDocType } from '@/lib/legal/defaults'
import { LANGS, type Lang } from '@/lib/i18n/config'
import { formatRevised } from '@/lib/legal/format'
import legalProse from '@/components/legal/legal.module.css'
import styles from './LegalEditor.module.css'

export interface LegalDocSnapshot {
  html: string
  source: 'db' | 'default'
  revisedAtISO: string
  updatedAtISO: string | null
  updatedBy: string | null
}

export type LegalDocsState = Record<LegalDocType, Record<Lang, LegalDocSnapshot>>

const DOC_LABELS: Record<LegalDocType, string> = {
  terms: 'Syarat & Ketentuan',
  privacy: 'Kebijakan Privasi',
  refund: 'Pengembalian Dana',
}
const LANG_LABELS: Record<Lang, string> = { id: 'ID', en: 'EN' }

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
  }).format(new Date(iso))
}

/**
 * `/admin/legal` editor body — document tabs (Syarat & Ketentuan / Kebijakan
 * Privasi / Pengembalian Dana) × ID/EN, the rich-text editor, a live preview,
 * the "perbaikan kecil" checkbox, and Simpan / Muat konten bawaan /
 * Kembalikan ke bawaan. Owns its own copy of the six (doc, lang) snapshots,
 * seeded from the server-rendered status matrix in page.tsx and updated
 * locally on every successful save/reset so the editor never waits on a full
 * page reload to reflect its own writes; `router.refresh()` still runs
 * afterwards so the separately-rendered status matrix table picks up the
 * change too.
 */
export default function LegalEditor({ initialDocs }: { initialDocs: LegalDocsState }) {
  const router = useRouter()
  const confirm = useAdminConfirm()
  const fb = useFeedback()

  const [docs, setDocs] = useState<LegalDocsState>(initialDocs)
  const [activeDoc, setActiveDoc] = useState<LegalDocType>('terms')
  const [activeLang, setActiveLang] = useState<Lang>('id')
  const [content, setContent] = useState<string>(initialDocs.terms.id.html)
  const [dirty, setDirty] = useState(false)
  const [minorFix, setMinorFix] = useState(false)
  const [busy, setBusy] = useState(false)

  const activeSnapshot = docs[activeDoc][activeLang]

  async function switchTo(doc: LegalDocType, lang: Lang) {
    if (doc === activeDoc && lang === activeLang) return
    if (dirty) {
      const ok = await confirm({
        title: 'Ada perubahan belum disimpan',
        message: 'Berpindah dokumen akan membuang perubahan yang belum disimpan pada editor saat ini. Lanjutkan?',
        confirmLabel: 'Buang & pindah',
        tone: 'danger',
      })
      if (!ok) return
    }
    setActiveDoc(doc)
    setActiveLang(lang)
    setContent(docs[doc][lang].html)
    setDirty(false)
    setMinorFix(false)
  }

  function onEditorChange(html: string) {
    setContent(html)
    setDirty(true)
  }

  async function onSave() {
    setBusy(true)
    const res = await saveLegalDoc({ docType: activeDoc, lang: activeLang, contentHtml: content, minorFix })
    setBusy(false)
    if (!res.ok) {
      fb.fail(res.error || 'Gagal menyimpan')
      return
    }
    const now = new Date().toISOString()
    setDocs((prev) => ({
      ...prev,
      [activeDoc]: {
        ...prev[activeDoc],
        [activeLang]: {
          html: content,
          source: 'db',
          revisedAtISO: minorFix ? prev[activeDoc][activeLang].revisedAtISO : now,
          updatedAtISO: now,
          updatedBy: prev[activeDoc][activeLang].updatedBy,
        },
      },
    }))
    setDirty(false)
    setMinorFix(false)
    fb.ok(minorFix ? 'Tersimpan — tanggal publik tidak berubah' : 'Tersimpan')
    router.refresh()
  }

  async function onLoadDefault() {
    if (dirty) {
      const ok = await confirm({
        title: 'Muat konten bawaan?',
        message: 'Ini mengganti isi editor saat ini (belum disimpan) dengan konten bawaan. Perubahan baru berlaku publik setelah kamu klik Simpan. Lanjutkan?',
        confirmLabel: 'Muat',
        tone: 'danger',
      })
      if (!ok) return
    }
    const html = await getDefaultLegalHtml(activeDoc, activeLang)
    if (!html) {
      fb.fail('Gagal memuat konten bawaan')
      return
    }
    setContent(html)
    setDirty(true)
  }

  async function onReset() {
    const ok = await confirm({
      title: 'Kembalikan ke bawaan?',
      message: `Override untuk ${DOC_LABELS[activeDoc]} (${LANG_LABELS[activeLang]}) akan dihapus dan halaman publik langsung menampilkan konten bawaan lagi.`,
      confirmLabel: 'Kembalikan',
      tone: 'danger',
    })
    if (!ok) return
    setBusy(true)
    const res = await resetLegalDoc({ docType: activeDoc, lang: activeLang })
    if (!res.ok) {
      setBusy(false)
      fb.fail(res.error || 'Gagal mengembalikan ke bawaan')
      return
    }
    const defaultHtml = await getDefaultLegalHtml(activeDoc, activeLang)
    setBusy(false)
    setDocs((prev) => ({
      ...prev,
      [activeDoc]: {
        ...prev[activeDoc],
        [activeLang]: { html: defaultHtml, source: 'default', revisedAtISO: DEFAULT_REVISED_ISO, updatedAtISO: null, updatedBy: null },
      },
    }))
    setContent(defaultHtml)
    setDirty(false)
    setMinorFix(false)
    fb.ok('Dikembalikan ke konten bawaan')
    router.refresh()
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.tabs}>
        <div role="tablist" aria-label="Dokumen" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {LEGAL_DOC_TYPES.map((doc) => (
            <button
              key={doc}
              type="button"
              role="tab"
              aria-selected={activeDoc === doc}
              className={`${styles.tab} ${activeDoc === doc ? styles.tabActive : ''}`}
              onClick={() => switchTo(doc, activeLang)}
            >
              {DOC_LABELS[doc]}
            </button>
          ))}
        </div>
        <div className={styles.langToggle} role="tablist" aria-label="Bahasa">
          {LANGS.map((lang) => (
            <button
              key={lang}
              type="button"
              role="tab"
              aria-selected={activeLang === lang}
              className={`${styles.langBtn} ${activeLang === lang ? styles.langBtnActive : ''}`}
              onClick={() => switchTo(activeDoc, lang)}
            >
              {LANG_LABELS[lang]}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.meta}>
        <span className={`${styles.badge} ${activeSnapshot.source === 'db' ? styles.badgeCustom : styles.badgeDefault}`}>
          {activeSnapshot.source === 'db' ? 'Kustom' : 'Bawaan'}
        </span>
        <span className={styles.metaText}>Tanggal publik: {formatRevised(activeSnapshot.revisedAtISO, activeLang)}</span>
        {activeSnapshot.updatedAtISO && (
          <span className={styles.metaText}>
            · Terakhir diubah: {formatDateTime(activeSnapshot.updatedAtISO)}
            {activeSnapshot.updatedBy ? ` oleh ${activeSnapshot.updatedBy}` : ''}
          </span>
        )}
      </div>

      <div className={styles.panels}>
        <div className={styles.panel}>
          <span className={styles.panelLabel}>Editor</span>
          <RichTextEditor
            value={content}
            onChange={onEditorChange}
            ariaLabel={`${DOC_LABELS[activeDoc]} (${LANG_LABELS[activeLang]})`}
          />
        </div>
        <div className={styles.panel}>
          <span className={styles.panelLabel}>Pratinjau</span>
          {/* Live preview reuses the exact `.prose` typography the public page
             renders with — never a simplified lookalike. */}
          <div className={`${styles.previewBox} ${legalProse.prose}`} dangerouslySetInnerHTML={{ __html: content }} />
        </div>
      </div>

      <label className={styles.minorFixRow}>
        <input type="checkbox" checked={minorFix} onChange={(e) => setMinorFix(e.target.checked)} />
        <span>
          <strong>Perbaikan kecil — jangan ubah tanggal.</strong>{' '}
          Centang ini untuk perbaikan kecil seperti salah ketik atau nomor kontak; tanggal “terakhir diperbarui” yang
          tampil ke publik tidak akan berubah, meskipun perubahannya tetap tersimpan.
        </span>
      </label>

      <div className={styles.actions}>
        <Button variant="ghost" size="sm" onClick={onLoadDefault} disabled={busy}>
          Muat konten bawaan
        </Button>
        <Button variant="ghostDanger" size="sm" onClick={onReset} disabled={busy || activeSnapshot.source !== 'db'}>
          Kembalikan ke bawaan
        </Button>
        <Button size="sm" onClick={onSave} disabled={busy || !dirty}>
          {busy ? 'Menyimpan…' : 'Simpan'}
        </Button>
      </div>
    </div>
  )
}
