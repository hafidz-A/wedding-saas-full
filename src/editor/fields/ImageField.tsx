'use client'

import { useRef, useState } from 'react'
import { useUpload } from '../lib/useUpload'
import { useDashboardDict } from '@/app/[template]/[slug]/dashboard/DashboardI18nProvider'
import { useFeedback } from '@/components/dashboard/FeedbackProvider'
import styles from './ImageField.module.css'

interface Props {
  label: string
  value: string
  onChange: (url: string) => void
  slug: string
  help?: string
}

const ACCEPT = 'image/jpeg,image/png,image/gif,image/webp'

export default function ImageField({ label, value, onChange, slug, help }: Props) {
  const fileInput = useRef<HTMLInputElement>(null)
  const { upload, isUploading, error } = useUpload(slug)
  const t = useDashboardDict().editor
  const fm = useDashboardDict().feedback
  const fb = useFeedback()
  const [dragActive, setDragActive] = useState(false)

  async function handleFile(file: File | undefined | null) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      fb.fail(fm.uploadFail)
      return
    }
    const url = await upload(file)
    if (url) {
      onChange(url)
      fb.ok(fm.imageUploaded)
    } else {
      fb.fail(fm.uploadFail)
    }
  }

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    await handleFile(e.target.files?.[0])
    e.target.value = ''
  }

  // Drag-and-drop — reuses the same upload path as the file picker.
  function onDragOver(e: React.DragEvent) {
    e.preventDefault()
    if (!isUploading) setDragActive(true)
  }
  function onDragLeave(e: React.DragEvent) {
    e.preventDefault()
    setDragActive(false)
  }
  async function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragActive(false)
    if (isUploading) return
    await handleFile(e.dataTransfer.files?.[0])
  }

  function openPicker() {
    if (!isUploading) fileInput.current?.click()
  }
  function onKeyOpen(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      openPicker()
    }
  }

  return (
    <div className={styles.field}>
      <span className={styles.label}>{label}</span>

      {value ? (
        <div className={styles.row}>
          <div
            className={`${styles.thumbZone} ${dragActive ? styles.dragActive : ''} ${isUploading ? styles.uploading : ''}`}
            role="button"
            tabIndex={0}
            aria-label={t.imageReplaceAria ?? 'Replace image'}
            onClick={openPicker}
            onKeyDown={onKeyOpen}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
          >
            <img src={value} alt="" className={styles.thumb} />
            {dragActive && <span className={styles.thumbHint}>{t.imageDropHint ?? 'Drop to replace'}</span>}
          </div>
          <div className={styles.btns}>
            <button type="button" className={styles.btn} disabled={isUploading} onClick={openPicker}>
              {isUploading ? (t.imageUploading ?? 'Uploading…') : (t.imageReplace ?? 'Replace')}
            </button>
            <button type="button" className={styles.btnGhost} onClick={() => onChange('')}>
              {t.imageRemove ?? 'Remove'}
            </button>
          </div>
        </div>
      ) : (
        <div
          className={`${styles.dropEmpty} ${dragActive ? styles.dragActive : ''} ${isUploading ? styles.uploading : ''}`}
          role="button"
          tabIndex={0}
          aria-label={t.imageUploadAria ?? 'Upload image'}
          onClick={openPicker}
          onKeyDown={onKeyOpen}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        >
          <svg className={styles.dropIcon} width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 16V4" />
            <path d="m7 9 5-5 5 5" />
            <path d="M5 16v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2" />
          </svg>
          <span className={styles.dropTitle}>
            {isUploading ? (t.imageUploading ?? 'Uploading…') : dragActive ? (t.imageDropNow ?? 'Drop image to upload') : (t.imageDropTitle ?? 'Drag & drop, or click to upload')}
          </span>
          <span className={styles.dropSub}>{t.imageEmptyHint}</span>
        </div>
      )}

      <input ref={fileInput} type="file" accept={ACCEPT} hidden onChange={onPick} />

      {error && <span className={styles.err}>{error}</span>}
      {help && <span className={styles.help}>{help}</span>}
    </div>
  )
}
