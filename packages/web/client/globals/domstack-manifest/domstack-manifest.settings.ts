import type { DomstackManifestOptions } from '@domstack/static/types.ts'
import type {
  BreadcrumPwaManifestVars,
  BreadcrumPwaPageVars,
  BreadcrumPwaPolicy,
} from '../service-worker/service-worker-settings.ts'
import { offlineFallbackUrl } from '../service-worker/service-worker-settings.ts'
import { shouldIncludePwaOutput } from './pwa-cache-policy.js'
import { emitWorkboxPolicy } from './policy-build.ts'

const settings = {
  manifestVars: ['offline', 'precache'],
  policy: {
    offlineFallbackUrl,
  },
  hooks: {
    manifestBuilt: [emitWorkboxPolicy],
  },
  includeEntry: shouldIncludePwaOutput,
} satisfies DomstackManifestOptions<BreadcrumPwaPolicy, BreadcrumPwaManifestVars, BreadcrumPwaPageVars>

export default settings
