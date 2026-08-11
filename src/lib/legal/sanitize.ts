// src/lib/legal/sanitize.ts
// Allowlist HTML sanitiser for admin-authored legal documents. Writers are
// AAL2 allowlisted admins, so this is defense-in-depth, not the only gate:
// it runs on save (admin action) AND on read (getLegalDoc) so a row written
// around the action still can't ship active content to the public pages.

/** Tags allowed in legal document bodies. Everything else is stripped
 *  (tag removed, inner text kept) — except DROP_WITH_CONTENT below. */
const ALLOWED_TAGS = new Set([
  'h2', 'h3', 'h4', 'p', 'ul', 'ol', 'li',
  'strong', 'em', 'b', 'i', 'u', 'code', 'span',
  'a', 'br', 'hr', 'blockquote',
])

/** Tags whose CONTENT is also dangerous — removed wholesale. */
const DROP_WITH_CONTENT = ['script', 'style', 'iframe', 'object', 'embed', 'svg', 'math', 'template', 'noscript']

/** href is the single attribute that survives, and only with a safe scheme. */
function safeHref(raw: string): string | null {
  const href = raw.trim()
  if (href === '') return null
  if (/^(https?:)?\/\//i.test(href)) return href // absolute http(s) / protocol-relative
  if (/^[/#]/.test(href)) return href // site-relative or fragment
  if (/^mailto:/i.test(href)) return href
  return null // javascript:, data:, vbscript:, anything exotic
}

function escapeAttr(v: string): string {
  return v.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

export function sanitizeLegalHtml(input: string): string {
  let html = String(input)

  // 1. Comments (incl. conditional comments) out first.
  html = html.replace(/<!--[\s\S]*?-->/g, '')

  // 2. Dangerous containers go with their content. Unclosed variants lose
  //    everything to the end of input (safe: better to drop than to leak).
  for (const tag of DROP_WITH_CONTENT) {
    html = html.replace(new RegExp(`<${tag}\\b[\\s\\S]*?<\\/${tag}\\s*>`, 'gi'), '')
    html = html.replace(new RegExp(`<${tag}\\b[\\s\\S]*$`, 'gi'), '')
  }

  // 3. Rebuild every remaining tag from scratch: allowed tags come back with
  //    no attributes (href excepted), everything else is dropped.
  html = html.replace(
    /<\s*(\/?)\s*([a-zA-Z][a-zA-Z0-9-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g,
    (_m, slash: string, rawTag: string, rawAttrs: string) => {
      const tag = rawTag.toLowerCase()
      if (!ALLOWED_TAGS.has(tag)) return ''
      if (slash) return `</${tag}>`
      if (tag === 'a') {
        const attr = /\bhref\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(rawAttrs)
        const href = attr ? safeHref(attr[2] ?? attr[3] ?? attr[4] ?? '') : null
        return href ? `<a href="${escapeAttr(href)}">` : '<a>'
      }
      if (tag === 'br' || tag === 'hr') return `<${tag} />`
      return `<${tag}>`
    },
  )

  // 4. Any stray '<' that never formed a tag can't stay raw.
  html = html.replace(/<(?![a-zA-Z/])/g, '&lt;')

  return html.trim()
}
