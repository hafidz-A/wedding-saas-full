export interface BuildWhatsAppArgs {
  phoneE164: string | null
  message: string
}

/**
 * buildWhatsAppUrl — produce a `wa.me` URL using the hybrid scheme:
 *   - phoneE164 present → wa.me/<phone>?text=...  (opens direct chat)
 *   - phoneE164 null    → wa.me/?text=...         (opens contact picker)
 */
export function buildWhatsAppUrl({ phoneE164, message }: BuildWhatsAppArgs): string {
  const text = encodeURIComponent(message)
  const base = phoneE164 ? `https://wa.me/${phoneE164}` : 'https://wa.me/'
  return `${base}?text=${text}`
}

export interface TemplateVars {
  name: string
  url: string
  token: string
}

/**
 * renderMessageTemplate — replace placeholders in the couple's message.
 *
 * Supported placeholders (English + Indonesian aliases):
 *   {{name}}  / {{nama}}   → guest's display name
 *   {{url}}   / {{link}}   → public invitation URL
 *   {{token}} / {{kode}}   → guest's single-use RSVP code
 *
 * Unknown placeholders are left in place so a typo doesn't silently
 * swallow part of the message.
 */
export function renderMessageTemplate(template: string, vars: TemplateVars): string {
  return template
    .replace(/\{\{\s*(name|nama)\s*\}\}/gi, vars.name)
    .replace(/\{\{\s*(url|link)\s*\}\}/gi, vars.url)
    .replace(/\{\{\s*(token|kode)\s*\}\}/gi, vars.token)
}
