/* Solary section registry. Re-exports the template's internal registry
   (config/sectionRegistry.js). NOTE: this transitively imports the planet
   sections (client/Three.js code) — only import it from client modules,
   never from a server component. */
import { sectionRegistry } from './config/sectionRegistry.js'

export { sectionRegistry }
export default sectionRegistry
