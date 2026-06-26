/**
 * Cross-tab editor sync over BroadcastChannel.
 *
 * Every dashboard editing surface (the section editor + the Palette / Music /
 * Title & Description / Ornament sub-tabs) writes the SAME invitation row. When
 * one surface saves, it bumps the row's `updated_at`, leaving any other open tab
 * of the same invitation holding a now-stale baseline. Instead of only finding
 * out at save time (a 409 wall), each surface announces its save here so sibling
 * tabs can react immediately:
 *
 *   • a sub-tab save (palette / music / meta / ornament) only touches keys the
 *     section editor PRESERVES on save, so the section editor just rebases its
 *     concurrency baseline — no conflict, no nag.
 *   • another SECTION editor save is a real content conflict, so the stale tab
 *     surfaces a gentle "reload for the latest" banner before the user keeps
 *     editing a version that can no longer be saved.
 *
 * Same-origin, same-browser only — that's the multi-tab case this targets.
 * Cross-device edits are still caught by the server's optimistic-concurrency
 * 409 (see api/invitation/[slug]/config/route.ts).
 */

export type EditorSurface = 'section' | 'palette' | 'music' | 'meta' | 'ornament'

export interface EditorSaveSignal {
  senderId: string
  surface: EditorSurface
  savedAt: string
}

const CHANNEL_PREFIX = 'wedding-editor:'

/** Stable per-tab id, so a tab ignores the echo of its own broadcasts. */
export const EDITOR_TAB_ID =
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)

// One shared channel per slug for the page's lifetime. Reusing (rather than
// open/post/close) avoids the close()-before-delivery race and keeps listeners
// and broadcasts on the same instance.
const channels = new Map<string, BroadcastChannel>()

function getChannel(slug: string): BroadcastChannel | null {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return null
  let ch = channels.get(slug)
  if (!ch) {
    ch = new BroadcastChannel(CHANNEL_PREFIX + slug)
    // Node exposes unref() on BroadcastChannel (browsers don't) — keep an idle
    // channel from holding the process open under test/SSR. No-op in browsers.
    ;(ch as unknown as { unref?: () => void }).unref?.()
    channels.set(slug, ch)
  }
  return ch
}

/** Announce a successful save to other tabs editing the same invitation. */
export function broadcastEditorSave(
  slug: string,
  surface: EditorSurface,
  savedAt: string | null | undefined,
): void {
  if (!savedAt) return
  const ch = getChannel(slug)
  if (!ch) return
  const signal: EditorSaveSignal = { senderId: EDITOR_TAB_ID, surface, savedAt }
  ch.postMessage(signal)
}

/**
 * Subscribe to saves from OTHER tabs of the same invitation. The handler never
 * fires for this tab's own broadcasts. Returns an unsubscribe fn.
 */
export function subscribeEditorSaves(
  slug: string,
  handler: (signal: EditorSaveSignal) => void,
): () => void {
  const ch = getChannel(slug)
  if (!ch) return () => {}
  const onMessage = (e: MessageEvent<EditorSaveSignal>) => {
    const data = e.data
    if (!data || typeof data !== 'object' || data.senderId === EDITOR_TAB_ID) return
    handler(data)
  }
  ch.addEventListener('message', onMessage)
  return () => ch.removeEventListener('message', onMessage)
}
