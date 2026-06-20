/// <reference lib="webworker" />

import { postToClients } from './clients.ts'
import { serviceWorker } from './context.ts'
import { prepareLatestManifestCache } from './precache.ts'

/**
 * Check whether the output manifest needs a new pending static cache.
 */
export async function checkForManifestUpdate () {
  if (serviceWorker.registration.installing || serviceWorker.registration.waiting) return

  try {
    const result = await prepareLatestManifestCache({ apply: false })
    if (!result || result.current) {
      await postToClients({ type: 'CACHE_UPDATE_CURRENT' })
      return
    }

    await postToClients({
      type: 'CACHE_UPDATE_READY',
      version: result.version,
    })
  } catch (err) {
    await postToClients({
      type: 'CACHE_UPDATE_FAILED',
      message: err instanceof Error ? err.message : String(err),
    })
  }
}
