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
}

export const DEVICE_PRESETS: DevicePreset[] = [
  { id: 'desktop',  label: 'Desktop',       kind: 'desktop', w: 1440, h: 900 },
  { id: 'ipad',     label: 'iPad Air',      kind: 'tablet',  w: 820,  h: 1180 },
  { id: 'iphone14', label: 'iPhone 14 Pro', kind: 'phone',   w: 393,  h: 852, notch: 'island' },
  { id: 'iphonese', label: 'iPhone SE',     kind: 'phone',   w: 375,  h: 667 },
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
