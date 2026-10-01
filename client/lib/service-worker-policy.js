/**
 * @import { DomstackManifest, DomstackManifestEntry } from '@domstack/static/types.js'
 * @typedef {Object} ServiceWorkerPolicy
 * @property {'network-only'} mode
 * @property {string | null} version
 * @property {ReadonlyArray<Readonly<Pick<DomstackManifestEntry, 'url' | 'revision'>>>} publicAssets
 */

/**
 * This inventory is not permission to cache: only copied public images/fonts qualify.
 * Reject document metadata and page-owned outputs even when marked static by DOMStack.
 * @param {DomstackManifestEntry} entry
 */
export function isPublicServiceWorkerAsset (entry) {
  if (entry.static !== true || entry.role !== 'subresource' || !entry.revision) return false
  if (entry.kind !== 'static' && entry.kind !== 'copy') return false
  if (entry.page || entry.pagePath || entry.pageUrl || entry.templatePath || entry.manifestVars) return false
  if (entry.url !== `/${entry.outputRelname}`) return false
  // beta.10 may report nested output paths as contentType; the filename allowlist is authoritative.
  if (/^(?:text\/|application\/(?:json|xml|xhtml\+xml))/.test(entry.contentType ?? '')) return false

  return entry.url === '/favicon.ico' || /^\/static\/(?:[\w-]+\/)*[\w-]+\.(?:png|jpe?g|gif|svg|webp|avif|ico|woff2?|ttf|otf)$/.test(entry.url)
}

/**
 * Expose only public URLs and revisions, never source paths or page variables.
 * @param {DomstackManifest} manifest
 * @returns {ServiceWorkerPolicy}
 */
export function createServiceWorkerPolicy (manifest) {
  return {
    mode: 'network-only',
    version: manifest.version,
    publicAssets: manifest.entries
      .filter(isPublicServiceWorkerAsset)
      .map(({ url, revision }) => ({ url, revision })),
  }
}
