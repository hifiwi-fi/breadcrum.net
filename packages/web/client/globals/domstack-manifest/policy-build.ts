import type {
  DomstackManifest,
  DomstackManifestBuiltHookContext,
  DomstackManifestEntry,
} from '@domstack/static/types.ts'
import type {
  BreadcrumPwaManifestVars,
  BreadcrumPwaPolicy,
  BreadcrumWorkboxPolicy,
  WorkboxPrecacheEntry,
} from '../service-worker/service-worker-settings.ts'
import {
  maxPrecacheBytes,
  offlineFallbackUrl,
  serviceWorkerPolicyDefineName,
} from '../service-worker/service-worker-settings.ts'

/** Inject Workbox precache policy data into `/service-worker.js`. */
export async function emitWorkboxPolicy (
  context: DomstackManifestBuiltHookContext<BreadcrumPwaPolicy, BreadcrumPwaManifestVars>
): Promise<void> {
  context.defineServiceWorkerConstant(
    serviceWorkerPolicyDefineName,
    toWorkboxPolicy(context.manifest)
  )
}

function toWorkboxPolicy (
  manifest: DomstackManifest<BreadcrumPwaPolicy, BreadcrumPwaManifestVars>
): BreadcrumWorkboxPolicy {
  return {
    version: manifest.version,
    precacheManifest: manifest.entries
      .filter(shouldPrecache)
      .map(toWorkboxPrecacheEntry),
    offlineFallbackUrl: manifest.policy?.offlineFallbackUrl ?? offlineFallbackUrl,
  }
}

function toWorkboxPrecacheEntry (entry: DomstackManifestEntry<BreadcrumPwaManifestVars>): WorkboxPrecacheEntry {
  return {
    url: entry.url,
    revision: entry.urlRevisioned ? null : entry.revision,
    ...(entry.integrity ? { integrity: entry.integrity } : {}),
  }
}

function shouldPrecache (entry: DomstackManifestEntry<BreadcrumPwaManifestVars>): boolean {
  if (!entry.revision) return false
  if (entry.bytes && entry.bytes > maxPrecacheBytes) return false
  if (entry.static !== true) return false
  if (entry.manifestVars?.precache === false || entry.manifestVars?.offline === false) return false
  return true
}
