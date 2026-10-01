/**
 * @import { DomstackManifestOptions, DomstackManifestBuiltHookContext } from '@domstack/static/types.js'
 */
import { createServiceWorkerPolicy, isPublicServiceWorkerAsset } from './lib/service-worker-policy.js'

/** @param {DomstackManifestBuiltHookContext} context */
function injectServiceWorkerPolicy (context) {
  context.defineServiceWorkerConstant('globalThis.BREADCRUM_SERVICE_WORKER_POLICY', createServiceWorkerPolicy(context.manifest))
}

// A settings module enables build metadata without publishing domstack-manifest.json.
/** @satisfies {DomstackManifestOptions} */
const settings = {
  includeEntry: isPublicServiceWorkerAsset,
  manifestVars: [],
  policy: { mode: 'network-only' },
  hooks: {
    manifestBuilt: [injectServiceWorkerPolicy],
  },
}

export default settings
