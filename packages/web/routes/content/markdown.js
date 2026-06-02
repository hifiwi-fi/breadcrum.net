/**
 * @import { ViewContext } from '#views/context.js'
 */

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import MarkdownIt from 'markdown-it'

/**
 * @typedef {string | boolean | string[]} ContentFrontmatterValue
 */

/**
 * @typedef {Record<string, ContentFrontmatterValue>} ContentFrontmatter
 */

/**
 * @typedef {object} RenderedMarkdownPage
 * @property {string} title
 * @property {string} html
 * @property {string} routePath
 * @property {string} sourceRelPath
 * @property {string} editUrl
 * @property {string | null} description
 * @property {string | null} image
 * @property {boolean} noindex
 * @property {string | null} publishDate
 * @property {string | null} updatedDate
 * @property {string | null} authorName
 * @property {string | null} authorUrl
 * @property {string | null} authorImgUrl
 * @property {string | null} authorImgAlt
 * @property {ContentFrontmatter} frontmatter
 */

/**
 * @typedef {object} ParsedMarkdownSource
 * @property {ContentFrontmatter} frontmatter
 * @property {string} body
 */

const contentRoot = fileURLToPath(new URL('../../content/', import.meta.url))
const repositoryRoot = path.resolve(contentRoot, '../../..')
const imageExtensions = new Set(['.gif', '.jpeg', '.jpg', '.png', '.svg', '.webp'])

const markdown = new MarkdownIt({
  html: true,
  linkify: false,
  typographer: true,
})

/**
 * @param {object} params
 * @param {string} params.filePath
 * @param {string} params.routePath
 * @param {ViewContext} params.context
 * @returns {Promise<RenderedMarkdownPage | null>}
 */
export async function loadMarkdownPage ({ filePath, routePath, context }) {
  let source
  try {
    source = await readFile(filePath, 'utf8')
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') return null
    throw error
  }

  const sourceRelPath = path.relative(repositoryRoot, filePath).replaceAll(path.sep, '/')
  const assetBasePath = contentAssetBasePath(filePath)
  const { frontmatter, body } = parseMarkdownSource(source)
  const vars = contentVariables(context, frontmatter)
  const preparedBody = prepareMarkdownBody(body, vars, assetBasePath)
  const html = markdown.render(preparedBody)
  const title = stringFrontmatter(frontmatter, 'title') ?? titleFromRoutePath(routePath)
  const image = stringFrontmatter(frontmatter, 'image')

  return {
    title,
    html,
    routePath,
    sourceRelPath,
    editUrl: `https://github.com/hifiwi-fi/breadcrum.net/blob/master/${sourceRelPath}`,
    description: stringFrontmatter(frontmatter, 'description'),
    image: image ? resolveContentAssetUrl(image, assetBasePath) : null,
    noindex: booleanFrontmatter(frontmatter, 'noindex'),
    publishDate: stringFrontmatter(frontmatter, 'publishDate'),
    updatedDate: stringFrontmatter(frontmatter, 'updatedDate'),
    authorName: stringFrontmatter(frontmatter, 'authorName'),
    authorUrl: stringFrontmatter(frontmatter, 'authorUrl'),
    authorImgUrl: stringFrontmatter(frontmatter, 'authorImgUrl'),
    authorImgAlt: stringFrontmatter(frontmatter, 'authorImgAlt'),
    frontmatter,
  }
}

/**
 * @param {string} filePath
 * @returns {Promise<ContentFrontmatter | null>}
 */
export async function loadMarkdownFrontmatter (filePath) {
  let source
  try {
    source = await readFile(filePath, 'utf8')
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') return null
    throw error
  }

  return parseMarkdownSource(source).frontmatter
}

/**
 * @param {string} source
 * @returns {ParsedMarkdownSource}
 */
export function parseMarkdownSource (source) {
  if (!source.startsWith('---')) {
    return {
      frontmatter: {},
      body: source,
    }
  }

  const frontmatterMatch = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(source)
  if (!frontmatterMatch) {
    return {
      frontmatter: {},
      body: source,
    }
  }

  return {
    frontmatter: parseFrontmatter(frontmatterMatch[1] ?? ''),
    body: source.slice(frontmatterMatch[0].length),
  }
}

/**
 * @param {ContentFrontmatter} frontmatter
 * @param {string} key
 * @returns {string | null}
 */
export function stringFrontmatter (frontmatter, key) {
  const value = frontmatter[key]
  return typeof value === 'string' ? value : null
}

/**
 * @param {ContentFrontmatter} frontmatter
 * @param {string} key
 * @returns {boolean}
 */
export function booleanFrontmatter (frontmatter, key) {
  return frontmatter[key] === true
}

/**
 * @param {string} section
 * @param {string[]} segments
 * @returns {string}
 */
export function markdownFilePath (section, segments) {
  return path.join(contentRoot, section, ...segments, 'README.md')
}

/**
 * @param {string} section
 * @returns {string}
 */
export function contentSectionPath (section) {
  return path.join(contentRoot, section)
}

/**
 * @param {string} routePath
 * @returns {string}
 */
function titleFromRoutePath (routePath) {
  const segments = routePath.split('/').filter(Boolean)
  const lastSegment = segments.at(-1) ?? 'Content'
  return humanizeSegment(lastSegment)
}

/**
 * @param {string} source
 * @returns {ContentFrontmatter}
 */
function parseFrontmatter (source) {
  /** @type {ContentFrontmatter} */
  const frontmatter = {}
  /** @type {string | null} */
  let listKey = null

  for (const rawLine of source.split(/\r?\n/)) {
    if (!rawLine.trim()) continue

    const listMatch = /^\s+-\s+(.+)$/.exec(rawLine)
    if (listKey && listMatch) {
      const list = frontmatter[listKey]
      if (Array.isArray(list)) list.push(String(parseScalar(listMatch[1] ?? '')))
      continue
    }

    const pairMatch = /^([A-Za-z0-9_]+):\s*(.*)$/.exec(rawLine)
    if (!pairMatch) continue

    const key = pairMatch[1] ?? ''
    const value = pairMatch[2] ?? ''
    if (!value) {
      frontmatter[key] = []
      listKey = key
      continue
    }

    frontmatter[key] = parseScalar(value)
    listKey = null
  }

  return frontmatter
}

/**
 * @param {string} value
 * @returns {string | boolean}
 */
function parseScalar (value) {
  const trimmed = value.trim()
  if (trimmed === 'true') return true
  if (trimmed === 'false') return false
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1)
  }

  return trimmed
}

/**
 * @param {string} body
 * @param {Record<string, unknown>} vars
 * @param {string} assetBasePath
 * @returns {string}
 */
function prepareMarkdownBody (body, vars, assetBasePath) {
  return rewriteRawAssetReferences(
    rewriteMarkdownAssetReferences(
      stripUnsupportedMarkdownAttributes(
        replaceTemplateVariables(body, vars)
      ),
      assetBasePath
    ),
    assetBasePath
  )
}

/**
 * @param {ViewContext} context
 * @param {ContentFrontmatter} frontmatter
 * @returns {Record<string, unknown>}
 */
function contentVariables (context, frontmatter) {
  const providers = {
    hostingProvider: 'Fly.io',
    storageProvider: 'Backblaze B2',
    emailProvider: 'AWS SES',
  }

  return {
    ...context,
    ...frontmatter,
    supportEmail: 'support@breadcrum.net',
    jurisdiction: 'California, USA',
    siteTwitter: '@breadcrum_',
    providers,
    hostingProvider: providers.hostingProvider,
    storageProvider: providers.storageProvider,
    emailProvider: providers.emailProvider,
  }
}

/**
 * @param {string} source
 * @param {Record<string, unknown>} vars
 * @returns {string}
 */
function replaceTemplateVariables (source, vars) {
  return source
    .replace(/\{\{#each vars\.([A-Za-z0-9_.]+)\}\}\r?\n([\s\S]*?)\r?\n\{\{\/each\}\}/g, (_match, key, block) => {
      const value = valueAtPath(vars, String(key))
      if (!Array.isArray(value)) return ''

      return value
        .map(item => String(block).replaceAll('{{this}}', String(item)))
        .join('\n')
    })
    .replace(/\{\{\s*vars\.([A-Za-z0-9_.]+)\s*\}\}/g, (_match, key) => {
      const value = valueAtPath(vars, String(key))
      return typeof value === 'string' || typeof value === 'boolean'
        ? String(value)
        : ''
    })
}

/**
 * `markdown-it-attrs` was previously applied by domstack. The live content only
 * needs image sizing hints, so remove unsupported attr suffixes instead of
 * exposing another parser plugin.
 *
 * @param {string} source
 * @returns {string}
 */
function stripUnsupportedMarkdownAttributes (source) {
  return source.replace(/(!\[[^\]]*]\([^)]+\))\{[^}\n]+\}/g, '$1')
}

/**
 * @param {string} source
 * @param {string} assetBasePath
 * @returns {string}
 */
function rewriteRawAssetReferences (source, assetBasePath) {
  return source.replace(/\b(src|srcset|href)="\.\/([^"]+)"/g, (match, attribute, value) => {
    const resolvedValue = resolveContentAssetUrl(`./${String(value)}`, assetBasePath)
    return resolvedValue === `./${String(value)}`
      ? match
      : `${String(attribute)}="${resolvedValue}"`
  })
}

/**
 * @param {string} source
 * @param {string} assetBasePath
 * @returns {string}
 */
function rewriteMarkdownAssetReferences (source, assetBasePath) {
  return source.replace(/(\]\()\.\/([^)]+)\)/g, (match, prefix, value) => {
    const resolvedValue = resolveContentAssetUrl(`./${String(value)}`, assetBasePath)
    return resolvedValue === `./${String(value)}`
      ? match
      : `${String(prefix)}${resolvedValue})`
  })
}

/**
 * @param {string} value
 * @param {string} assetBasePath
 * @returns {string}
 */
function resolveContentAssetUrl (value, assetBasePath) {
  if (!value.startsWith('./')) return value

  const pathname = value.split(/[?#]/)[0] ?? value
  if (!imageExtensions.has(path.extname(pathname).toLowerCase())) return value

  return `${assetBasePath}/${value.slice(2)}`.replaceAll('\\', '/')
}

/**
 * @param {string} filePath
 * @returns {string}
 */
function contentAssetBasePath (filePath) {
  const relDir = path.relative(contentRoot, path.dirname(filePath)).replaceAll(path.sep, '/')
  return `/content/${relDir}`
}

/**
 * @param {Record<string, unknown>} vars
 * @param {string} pathName
 * @returns {unknown}
 */
function valueAtPath (vars, pathName) {
  /** @type {unknown} */
  let value = vars
  for (const segment of pathName.split('.')) {
    if (!value || typeof value !== 'object') return undefined
    value = /** @type {Record<string, unknown>} */ (value)[segment]
  }
  return value
}

/**
 * @param {string} segment
 * @returns {string}
 */
function humanizeSegment (segment) {
  return segment
    .replaceAll('-', ' ')
    .replace(/\b\w/g, value => value.toUpperCase())
}

/**
 * @param {unknown} error
 * @returns {error is NodeJS.ErrnoException}
 */
function isNodeError (error) {
  return error instanceof Error && 'code' in error
}
