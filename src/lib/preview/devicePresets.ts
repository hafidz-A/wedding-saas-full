/**
 * Device presets for the live-preview "inspect" mode (the 🎨 palette switcher
 * in demo invitations). Desktop = no frame (fits the user's screen); the rest
 * render the invitation inside a phone/tablet bezel via an iframe.
 */
export type DeviceKind = 'desktop' | 'tablet' | 'phone'

export type DevicePreset = {
  id: string
  label: string
  kind: DeviceKind
  /** Real device logical px — drives the bezel aspect-ratio + dimensions caption. */
  w: number
  h: number
  notch?: 'island' | 'notch' | 'punch'
  /** Foldables only: the inner (unfolded) display size. `w`/`h` above is the
   *  folded cover screen; presence of this drives the Fold/Unfold toggle. */
  unfolded?: { w: number; h: number }
}

export const DEVICE_PRESETS: DevicePreset[] = [
  { id: 'desktop',  label: 'Desktop',       kind: 'desktop', w: 1440, h: 900 },
  { id: 'ipad',     label: 'iPad Air',      kind: 'tablet',  w: 820,  h: 1180 },
  { id: 'iphone14', label: 'iPhone 14 Pro', kind: 'phone',   w: 393,  h: 852, notch: 'island' },
  // Galaxy Z Fold — folded cover display is 344px logical (narrowest mainstream
  // viewport, matches Chrome DevTools "Galaxy Z Fold 5"); unfolded reveals the
  // near-square inner display. The Fold/Unfold toggle switches between them.
  { id: 'galaxyfold', label: 'Galaxy Z Fold', kind: 'phone', w: 344, h: 882, notch: 'punch',
    unfolded: { w: 884, h: 1104 } },
  { id: 'iphonex',  label: 'iPhone X',      kind: 'phone',   w: 375,  h: 812, notch: 'notch' },
  { id: 'galaxy',   label: 'Galaxy Note',   kind: 'phone',   w: 412,  h: 915, notch: 'punch' },
]

export const DEFAULT_DEVICE = 'desktop'

export function isDeviceId(id: unknown): id is string {
  return typeof id === 'string' && DEVICE_PRESETS.some((d) => d.id === id)
}

export function getDevice(id: string | undefined): DevicePreset {
  return DEVICE_PRESETS.find((d) => d.id === id) ?? DEVICE_PRESETS[0]
}
