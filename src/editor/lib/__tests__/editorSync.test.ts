// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest'

/**
 * The cross-tab save signal layer. Node provides BroadcastChannel, but the
 * module short-circuits to a no-op when `window` is absent (its SSR guard), so
 * we emulate a browser realm for the duration of these tests.
 */
describe('editorSync — cross-tab save signalling', () => {
  let sync: typeof import('../editorSync')

  beforeAll(async () => {
    ;(globalThis as { window?: unknown }).window = globalThis
    sync = await import('../editorSync')
  })
  afterAll(() => {
    delete (globalThis as { window?: unknown }).window
  })

  const tick = () => new Promise((r) => setTimeout(r, 25))

  it('delivers a save from another tab to a subscriber, and ignores own echoes', async () => {
    const slug = 'sync-' + Math.random().toString(36).slice(2)
    const got: import('../editorSync').EditorSaveSignal[] = []
    const unsub = sync.subscribeEditorSaves(slug, (s) => got.push(s))

    // "Another tab" = a separate BroadcastChannel instance with the same name.
    const otherTab = new BroadcastChannel('wedding-editor:' + slug)
    otherTab.postMessage({ senderId: 'other-tab', surface: 'palette', savedAt: '2026-01-01T00:00:00.000Z' })
    await tick()
    expect(got).toHaveLength(1)
    expect(got[0]).toMatchObject({ surface: 'palette' })

    // A message echoing THIS tab's id must be ignored (no self-reaction).
    otherTab.postMessage({ senderId: sync.EDITOR_TAB_ID, surface: 'section', savedAt: '2026-01-01T00:01:00.000Z' })
    await tick()
    expect(got).toHaveLength(1)

    unsub()
    otherTab.postMessage({ senderId: 'other-tab', surface: 'meta', savedAt: '2026-01-01T00:02:00.000Z' })
    await tick()
    expect(got).toHaveLength(1) // unsubscribed → no further delivery

    otherTab.close()
  })

  it('broadcastEditorSave reaches another tab; a null savedAt is a no-op', async () => {
    const slug = 'sync-' + Math.random().toString(36).slice(2)
    const otherTab = new BroadcastChannel('wedding-editor:' + slug)
    const got: unknown[] = []
    otherTab.addEventListener('message', (e) => got.push((e as MessageEvent).data))

    sync.broadcastEditorSave(slug, 'section', '2026-01-01T00:00:00.000Z')
    await tick()
    expect(got).toHaveLength(1)
    expect(got[0]).toMatchObject({ surface: 'section', senderId: sync.EDITOR_TAB_ID })

    sync.broadcastEditorSave(slug, 'section', null)
    await tick()
    expect(got).toHaveLength(1) // null savedAt → nothing posted

    otherTab.close()
  })
})
