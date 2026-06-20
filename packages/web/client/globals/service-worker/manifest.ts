/// <reference lib="webworker" />

import { DOMSTACK_MANIFEST_URL, DOMSTACK_OUTPUT_MANIFEST_ENABLED, shouldIncludePwaOutput } from '../pwa-cache-policy.js'
import { serviceWorker } from './context.ts'
import type { BuildOutputEntry, BuildOutputManifest } from './types.ts'

/**
 * Fetch and minimally validate Domstack's generated output manifest.
 */
export async function fetchOutputManifest (): Promise<BuildOutputManifest> {
  if (!DOMSTACK_OUTPUT_MANIFEST_ENABLED) {
    throw new Error('Domstack output manifest is disabled for this build')
  }

  const response = await fetch(DOMSTACK_MANIFEST_URL, {
    cache: 'no-store',
    credentials: 'same-origin',
  })

  if (!response.ok) {
    throw new Error('Unable to load Domstack manifest: ' + response.status + ' ' + response.statusText)
  }

  const manifest = await response.json()
  if (!manifest || typeof manifest.version !== 'string' || !Array.isArray(manifest.entries)) {
    throw new Error('Domstack manifest has an invalid shape')
  }

  return manifest as BuildOutputManifest
}

/**
 * Apply Breadcrum's offline cache scope to a Domstack output entry.
 */
export function shouldPrecacheEntry (entry: BuildOutputEntry) {
  return shouldIncludePwaOutput(entry, serviceWorker.location.origin)
}
