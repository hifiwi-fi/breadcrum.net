/**
 * @typedef {object} PwaCacheOutputEntry
 * @property {string} url
 * @property {string | null | undefined} [revision]
 * @property {string} [kind]
 * @property {string} [outputRelname]
 * @property {string} [sourceRelname]
 * @property {{ vars?: { precache?: unknown, offline?: unknown } }} [page]
 */

export const DOMSTACK_OUTPUT_MANIFEST_ENABLED = process.env['DOMSTACK_OUTPUT_MANIFEST_ENABLED'] !== 'false'
export const DOMSTACK_MANIFEST_URL = process.env['DOMSTACK_OUTPUT_MANIFEST_URL'] ?? '/domstack-output-manifest.json'
export const DOMSTACK_SERVICE_WORKER_URL = process.env['DOMSTACK_SERVICE_WORKER_URL'] ?? '/service-worker.js'

export const pwaBuildManifestExclude = [
  'api/**',
  'admin/**',
  'blog/**',
  'layouts/article/**',
  'layouts/blog-index/**',
  '**/*.map',
  'domstack-output-manifest.json',
  'feed.json',
  'feed.xml',
  'giscus.json',
  'robots.txt',
  DOMSTACK_SERVICE_WORKER_URL.replace(/^\/+/, ''),
  'sitemap.xml',
]

const excludedRootPaths = new Set([
  '/api',
  '/admin',
  '/blog',
])

const excludedExactPaths = new Set([
  DOMSTACK_MANIFEST_URL,
  '/feed.json',
  '/feed.xml',
  '/giscus.json',
  '/robots.txt',
  DOMSTACK_SERVICE_WORKER_URL,
  '/sitemap.xml',
])

const excludedPathPrefixes = [
  '/api/',
  '/admin/',
  '/blog/',
  '/layouts/article/',
  '/layouts/blog-index/',
]

const excludedRelnamePrefixes = [
  'api/',
  'admin/',
  'blog/',
  'layouts/article/',
  'layouts/blog-index/',
]

/**
 * Decide whether a Domstack output is part of Breadcrum's static offline shell.
 *
 * @param {PwaCacheOutputEntry} entry
 * @param {string} origin
 */
export function shouldIncludePwaOutput (entry, origin) {
  if (!entry || typeof entry.url !== 'string') return false
  if (typeof entry.revision !== 'string') return false
  if (entry.kind === 'metadata' || entry.kind === 'sourcemap') return false

  const siteOrigin = new URL(origin).origin
  const url = new URL(entry.url, siteOrigin)
  if (url.origin !== siteOrigin) return false

  const pathname = url.pathname
  if (pathname.endsWith('.map')) return false
  if (excludedRootPaths.has(pathname)) return false
  if (excludedExactPaths.has(pathname)) return false
  if (excludedPathPrefixes.some(prefix => pathname.startsWith(prefix))) return false

  if (entry.outputRelname && excludedRelnamePrefixes.some(prefix => entry.outputRelname?.startsWith(prefix))) return false
  if (entry.sourceRelname && excludedRelnamePrefixes.some(prefix => entry.sourceRelname?.startsWith(prefix))) return false
  if (entry.page?.vars?.precache === false || entry.page?.vars?.offline === false) return false

  return true
}
