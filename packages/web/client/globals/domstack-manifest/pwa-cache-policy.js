/**
 * @import { DomstackManifestEntry } from '@domstack/static/types.ts'
 */

const excludedRootPaths = new Set([
  '/api',
  '/admin',
  '/blog',
])

const excludedExactPaths = new Set([
  '/domstack-manifest.json',
  '/feed.json',
  '/feed.xml',
  '/giscus.json',
  '/robots.txt',
  '/service-worker.js',
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
 * Decide whether a Domstack manifest entry belongs in Breadcrum's static PWA shell.
 *
 * @param {DomstackManifestEntry<{ precache?: boolean, offline?: boolean }>} entry
 */
export function shouldIncludePwaOutput (entry) {
  if (!entry || typeof entry.url !== 'string') return false
  if (typeof entry.revision !== 'string') return false
  if (entry.kind === 'metadata' || entry.kind === 'sourcemap' || entry.kind === 'service-worker') return false

  const url = new URL(entry.url, 'https://breadcrum.invalid')
  const pathname = url.pathname

  if (pathname.endsWith('.map')) return false
  if (excludedRootPaths.has(pathname)) return false
  if (excludedExactPaths.has(pathname)) return false
  if (excludedPathPrefixes.some(prefix => pathname.startsWith(prefix))) return false

  if (entry.outputRelname && excludedRelnamePrefixes.some(prefix => entry.outputRelname?.startsWith(prefix))) return false
  if (entry.sourceRelname && excludedRelnamePrefixes.some(prefix => entry.sourceRelname?.startsWith(prefix))) return false
  if (entry.manifestVars?.precache === false || entry.manifestVars?.offline === false) return false

  return true
}
