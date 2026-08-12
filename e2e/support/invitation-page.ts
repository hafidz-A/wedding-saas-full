import type { Page, FrameLocator } from '@playwright/test'

/**
 * The root to query invitation content from.
 *
 * Phones get the invitation inside a fullscreen same-origin `?embed=1` iframe
 * (PhoneFrameView) so the mobile URL bar never moves mid-scroll. Specs that
 * query the top-level document therefore find only the wrapper on a phone UA.
 *
 * Returning a FrameLocator when the frame exists — rather than appending
 * `?noframe=1` everywhere — keeps the wrapper itself under test. It is
 * load-bearing (see the phone-frame and no-overscroll design notes), and a spec
 * that opts out of it would go green even if the wrapper stopped rendering.
 */
export async function invitationRoot(page: Page): Promise<Page | FrameLocator> {
  // NOTE: this selector assumes the invitation page's own PhoneFrameView iframe —
  // it is not scoped further (e.g. by a wrapper container). The marketing demo
  // drawer also renders a device-preview iframe with `?embed=1` in its src; that
  // page is unreachable from the specs that use this helper today, but a future
  // caller navigating a page that also contains a preview iframe would silently
  // get the wrong root here. Tighten the selector if that ever becomes reachable.
  const frame = page.locator('iframe[src*="embed=1"]')
  if ((await frame.count()) > 0) {
    await frame.first().waitFor({ state: 'attached', timeout: 30_000 })
    return page.frameLocator('iframe[src*="embed=1"]')
  }
  return page
}
