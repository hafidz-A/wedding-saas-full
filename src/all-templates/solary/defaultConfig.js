/* Solary default config — re-exports the bundled galactic pageConfig
   under the multi-template `defaultConfig` name. Plain data only (no
   client/Three.js imports) so it is safe to import server-side. */
import { pageConfig } from './config/pageConfig.js'

export const defaultConfig = pageConfig
export default defaultConfig
