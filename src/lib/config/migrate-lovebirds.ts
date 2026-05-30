/** Section types removed from lovebirds — stripped from any config on load/render. */
const DROP_TYPES = new Set(['guestbook', 'countdown'])

interface Section {
  id: string
  type: string
  props?: Record<string, any>
  [k: string]: any
}
interface Config {
  sections?: Section[]
  [k: string]: any
}

/**
 * Migrate a lovebirds config to the new editor model:
 *  - drop `guestbook` + `countdown` sections (removed from lovebirds), and
 *  - fold a standalone `registry` section's data into the `weddingGift`
 *    section (registryEnabled / registryTitle / registryMessage / platforms),
 *    then drop the standalone section.
 *
 * Pure, idempotent, null-safe — safe to run on every editor load and public
 * render. If no `weddingGift` section exists, the registry data is dropped.
 */
export function migrateLovebirdsConfig<T extends Config | null | undefined>(config: T): T {
  if (!config || !Array.isArray(config.sections)) return config

  let registrySection: Section | null = null
  const kept: Section[] = []
  for (const s of config.sections) {
    if (!s) continue
    if (s.type === 'registry') {
      registrySection = s
      continue
    }
    if (DROP_TYPES.has(s.type)) continue
    kept.push({ ...s })
  }

  if (registrySection) {
    const wg = kept.find((s) => s.type === 'weddingGift')
    if (wg) {
      const r = registrySection.props || {}
      wg.props = {
        ...(wg.props || {}),
        registryEnabled: true,
        registryTitle: r.title ?? wg.props?.registryTitle,
        registryMessage: r.message ?? wg.props?.registryMessage,
        platforms: r.platforms ?? wg.props?.platforms,
      }
    }
  }

  return { ...config, sections: kept } as T
}
