'use client'

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useAdminForm } from '@/components/admin/AdminDialogProvider'
import ui from '@/components/ui/controls.module.css'
import legalProse from '@/components/legal/legal.module.css'
import styles from './RichTextEditor.module.css'

type BlockState = 'h2' | 'h3' | 'p'

interface CaretState {
  bold: boolean
  italic: boolean
  block: BlockState
  ul: boolean
  ol: boolean
  linkHref: string | null
}

const EMPTY_CARET: CaretState = { bold: false, italic: false, block: 'p', ul: false, ol: false, linkHref: null }

function safeState(cmd: string): boolean {
  try {
    return document.queryCommandState(cmd)
  } catch {
    return false
  }
}

/**
 * Hand-rolled contentEditable rich-text editor for `/admin/legal` — no new
 * dependency (house rule: no UI library). Scope is small and fixed (H2/H3,
 * bold/italic, bulleted/numbered lists, links, clear formatting), so the
 * deprecated-but-universally-supported `document.execCommand` API is a
 * reasonable fit; a ProseMirror/Tiptap-scale editor would be overkill here.
 *
 * Controlled `value`/`onChange` (HTML string) — the parent (`LegalEditor`)
 * owns dirty state and decides when to stomp the DOM (tab switch, "muat
 * konten bawaan", reset) vs. leave it alone (every keystroke).
 *
 * Typography matches the public legal pages via `legal.module.css`'s
 * `.prose` class, reused verbatim rather than re-declared.
 *
 * Paste is intercepted and stripped to plain text — pasted markup (from
 * Word, Google Docs, a web page) never enters a legal document through this
 * editor. `sanitizeLegalHtml` also runs again server-side on save, so this
 * is about authoring hygiene, not the only safety net.
 */
export default function RichTextEditor({
  value,
  onChange,
  ariaLabel,
  placeholder,
}: {
  value: string
  onChange: (html: string) => void
  ariaLabel?: string
  placeholder?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const lastEmitted = useRef<string>(value)
  const savedRangeRef = useRef<Range | null>(null)
  const [caret, setCaret] = useState<CaretState>(EMPTY_CARET)
  const form = useAdminForm()

  // Controlled sync: only overwrite the DOM when `value` changed from
  // OUTSIDE this component (a tab switch, "muat konten bawaan", a reset) —
  // never in reaction to our own onInput, or every keystroke would reset
  // the caret to the start of the document.
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    if (value !== lastEmitted.current) {
      el.innerHTML = value
      lastEmitted.current = value
    }
  }, [value])

  const emit = useCallback(() => {
    const el = ref.current
    if (!el) return
    const html = el.innerHTML
    lastEmitted.current = html
    onChange(html)
  }, [onChange])

  const readCaretState = useCallback(() => {
    const el = ref.current
    if (!el) return
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0 || !sel.anchorNode || !el.contains(sel.anchorNode)) {
      setCaret(EMPTY_CARET)
      return
    }
    let block: BlockState = 'p'
    try {
      const fb = String(document.queryCommandValue('formatBlock')).toLowerCase()
      if (fb === 'h2' || fb === 'h3') block = fb
    } catch {
      /* queryCommandValue can throw in some browsers when unsupported — default to 'p'. */
    }
    let linkHref: string | null = null
    let node: Node | null = sel.anchorNode
    while (node && node !== el) {
      if (node instanceof HTMLAnchorElement) {
        linkHref = node.getAttribute('href')
        break
      }
      node = node.parentNode
    }
    setCaret({
      bold: safeState('bold'),
      italic: safeState('italic'),
      block,
      ul: safeState('insertUnorderedList'),
      ol: safeState('insertOrderedList'),
      linkHref,
    })
  }, [])

  useEffect(() => {
    document.addEventListener('selectionchange', readCaretState)
    return () => document.removeEventListener('selectionchange', readCaretState)
  }, [readCaretState])

  function exec(cmd: string, arg?: string) {
    ref.current?.focus()
    document.execCommand(cmd, false, arg)
    emit()
    readCaretState()
  }

  function toggleBlock(tag: 'h2' | 'h3') {
    ref.current?.focus()
    const next = caret.block === tag ? 'P' : tag.toUpperCase()
    document.execCommand('formatBlock', false, next)
    emit()
    readCaretState()
  }

  function onPaste(e: React.ClipboardEvent<HTMLDivElement>) {
    e.preventDefault()
    const text = e.clipboardData.getData('text/plain')
    document.execCommand('insertText', false, text)
    emit()
  }

  async function onLinkClick() {
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0) savedRangeRef.current = sel.getRangeAt(0).cloneRange()

    const result = await form({
      title: caret.linkHref ? 'Ubah tautan' : 'Tambah tautan',
      message: 'Kosongkan URL lalu simpan untuk menghapus tautan dari teks terpilih.',
      fields: [
        { name: 'href', label: 'URL', type: 'text', defaultValue: caret.linkHref ?? 'https://', placeholder: 'https://…' },
      ],
      submitLabel: caret.linkHref ? 'Perbarui' : 'Tambah',
    })
    if (result === null) return

    const el = ref.current
    el?.focus()
    if (savedRangeRef.current) {
      const sel2 = window.getSelection()
      sel2?.removeAllRanges()
      sel2?.addRange(savedRangeRef.current)
    }

    const href = (result.href || '').trim()
    if (href) document.execCommand('createLink', false, href)
    else document.execCommand('unlink')
    emit()
    readCaretState()
  }

  function clearFormatting() {
    ref.current?.focus()
    document.execCommand('removeFormat')
    document.execCommand('unlink')
    document.execCommand('formatBlock', false, 'P')
    emit()
    readCaretState()
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar} role="toolbar" aria-label="Format teks">
        <ToolbarBtn active={caret.block === 'h2'} onClick={() => toggleBlock('h2')} label="Heading H2">H2</ToolbarBtn>
        <ToolbarBtn active={caret.block === 'h3'} onClick={() => toggleBlock('h3')} label="Heading H3">H3</ToolbarBtn>
        <span className={styles.divider} aria-hidden="true" />
        <ToolbarBtn active={caret.bold} onClick={() => exec('bold')} label="Tebal">
          <strong>B</strong>
        </ToolbarBtn>
        <ToolbarBtn active={caret.italic} onClick={() => exec('italic')} label="Miring">
          <em>I</em>
        </ToolbarBtn>
        <span className={styles.divider} aria-hidden="true" />
        <ToolbarBtn active={caret.ul} onClick={() => exec('insertUnorderedList')} label="Daftar bullet">• List</ToolbarBtn>
        <ToolbarBtn active={caret.ol} onClick={() => exec('insertOrderedList')} label="Daftar bernomor">1. List</ToolbarBtn>
        <span className={styles.divider} aria-hidden="true" />
        <ToolbarBtn active={!!caret.linkHref} onClick={onLinkClick} label="Tautan">Link</ToolbarBtn>
        <span className={styles.divider} aria-hidden="true" />
        <ToolbarBtn onClick={clearFormatting} label="Hapus format">Clear</ToolbarBtn>
      </div>
      <div
        ref={ref}
        className={`${styles.editable} ${legalProse.prose}`}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label={ariaLabel || 'Konten dokumen'}
        data-placeholder={placeholder}
        onInput={emit}
        onPaste={onPaste}
        onKeyUp={readCaretState}
        onMouseUp={readCaretState}
        onFocus={readCaretState}
      />
    </div>
  )
}

function ToolbarBtn({
  active,
  onClick,
  label,
  children,
}: {
  active?: boolean
  onClick: () => void
  label: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      className={`${ui.iconBtn} ${styles.toolBtn} ${active ? styles.toolBtnActive : ''}`}
      // Keep the editor's caret/selection alive — a normal button click would
      // steal focus (and the selection) from the contentEditable first.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      aria-pressed={!!active}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  )
}
