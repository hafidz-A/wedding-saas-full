/* ============================================================================
   TEMPLATE INDEX — master registry of available invitation templates.

   SERVER-SAFE: imports only plain-data `defaultConfig` objects (no Shells,
   no section registries, no Three.js). Safe to import from server components
   (e.g. [template]/[slug]/page.tsx) and the marketing /templates gallery.

   The per-template render Shells are client components, dynamic-imported in
   src/app/[template]/[slug]/InvitationView.tsx — not here.
   ============================================================================ */
import { defaultConfig as lovebirdsConfig } from '../all-templates/lovebirds/defaultConfig.js'
import { defaultConfig as solaryConfig } from '../all-templates/solary/defaultConfig.js'

export const templates = {
  lovebirds: { label: 'Lovebirds', config: lovebirdsConfig },
  solary: { label: 'Solary', config: solaryConfig },
}

export const TEMPLATE_IDS = Object.keys(templates)

export const DEFAULT_TEMPLATE_ID = 'lovebirds'

export function isValidTemplate(id) {
  return Object.prototype.hasOwnProperty.call(templates, id)
}

export function getTemplate(id) {
  return templates[id] || templates[DEFAULT_TEMPLATE_ID]
}

export function getDefaultConfig(id) {
  return getTemplate(id).config
}

export function getTemplateLabel(id) {
  return getTemplate(id).label
}
