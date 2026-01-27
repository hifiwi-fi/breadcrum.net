import { isNotSSRF } from '../urls/ssrf-check.js'

/**
 * @typedef {object} NormalizeUrlCache
 * @property {(key: string) => Promise<{ item?: string } | { value?: string } | string | null | undefined>} get
 * @property {(key: string, value: string, ttlMs?: number) => Promise<void> | void} set
 */

/**
 * @typedef {object} NormalizeUrlOptions
 * @property {boolean} [followShorteners=true] - Follow redirects for known shorteners.
 * @property {number} [maxRedirects=5] - Max redirect hops when expanding short URLs.
 * @property {number} [timeoutMs=5000] - Timeout per request when expanding short URLs.
 * @property {NormalizeUrlCache} [cache] - Optional cache for shortener expansions.
 */

const SHORTENER_CACHE_TTL_MS = 5 * 60 * 1000
const SHORTENER_CACHE_PREFIX = 'normalize-url:shortener:'

const SHORTENER_HOSTS = new Set([
  't.co',
  'bit.ly',
  'bitly.com',
  'tinyurl.com',
  'ow.ly',
  'buff.ly',
  'lnkd.in',
  't.ly',
  'is.gd',
  'rebrand.ly',
  'shorturl.at',
  'trib.al',
])

const HOST_REWRITES = new Map([
  ['m.youtube.com', 'www.youtube.com'],
  ['music.youtube.com', 'www.youtube.com'],
  ['youtube.com', 'www.youtube.com'],
  ['youtube-nocookie.com', 'www.youtube.com'],
  ['www.youtube-nocookie.com', 'www.youtube.com'],
  ['mobile.twitter.com', 'x.com'],
  ['m.twitter.com', 'x.com'],
  ['twitter.com', 'x.com'],
  ['mobile.x.com', 'x.com'],
  ['m.x.com', 'x.com'],
])

const TRACKING_PARAMS = new Set([
  // Meta/Facebook
  'fbclid',
  'igshid',
  // Google/Ads
  'gclid',
  'dclid',
  'gbraid',
  'wbraid',
  // Microsoft Ads
  'msclkid',
  // Mailchimp
  'mc_cid',
  'mc_eid',
  // Marketo
  'mkt_tok',
  // Generic referral markers
  'ref',
  'ref_src',
  'spm',
  'yclid',
  // X/Twitter media viewer
  'currenttweet',
  'currenttweetuser',
])

const YOUTUBE_ALLOWED_PARAMS = new Set(['v', 'list', 'index', 't'])

const X_HOSTS = new Set([
  'x.com',
  'mobile.x.com',
  'm.x.com',
  'twitter.com',
  'mobile.twitter.com',
  'm.twitter.com',
])

/**
 * Normalizes a URL object by modifying its host property if necessary.
 *
 * @param {URL} url - The URL string to be normalized.
 * @param {NormalizeUrlOptions} [options] - Optional normalization configuration.
 * @returns {Promise<URL>} An object containing the normalized URL string.
 */
export async function normalizeURL (url, options = {}) {
  const { followShorteners = true, maxRedirects = 5, timeoutMs = 5000, cache } = options
  let workingUrl = new URL(url.toString())

  sanitizeUrl(workingUrl)

  if (followShorteners && typeof fetch === 'function' && isShortenerHost(workingUrl.hostname)) {
    workingUrl = await expandShortUrl(workingUrl, { maxRedirects, timeoutMs, cache })
    sanitizeUrl(workingUrl)
  }

  applyHostRewrites(workingUrl)
  normalizeYouTubeUrl(workingUrl)
  normalizeXUrl(workingUrl)
  stripTrackingParams(workingUrl)
  sortQueryParams(workingUrl)

  return workingUrl
}

/**
 * @param {string} hostname
 * @returns {boolean}
 */
function isShortenerHost (hostname) {
  return SHORTENER_HOSTS.has(hostname)
}

/**
 * @param {URL} url
 */
function sanitizeUrl (url) {
  url.protocol = url.protocol.toLowerCase()
  if (url.hostname) url.hostname = url.hostname.toLowerCase()

  if (url.protocol === 'http:' && url.port === '80') url.port = ''
  if (url.protocol === 'https:' && url.port === '443') url.port = ''
}

/**
 * @param {URL} url
 */
function applyHostRewrites (url) {
  const replacement = HOST_REWRITES.get(url.hostname)
  if (replacement) url.hostname = replacement
}

/**
 * Validates a YouTube video ID.
 * YouTube IDs are typically 11 characters, but can vary.
 * @param {string} id
 * @returns {boolean}
 */
function isValidYouTubeId (id) {
  return id && id.length > 0 && id.length <= 20 && /^[a-zA-Z0-9_-]+$/.test(id)
}

/**
 * @param {URL} url
 */
function normalizeYouTubeUrl (url) {
  if (url.hostname === 'youtu.be') {
    const id = url.pathname.split('/').filter(Boolean)[0]
    if (id && isValidYouTubeId(id)) {
      url.hostname = 'www.youtube.com'
      url.pathname = '/watch'
      url.searchParams.set('v', id)
    }
  }

  if (url.hostname !== 'www.youtube.com') return

  const segments = url.pathname.split('/').filter(Boolean)
  if (segments[0] === 'shorts' && segments[1] && isValidYouTubeId(segments[1])) {
    url.pathname = '/watch'
    url.searchParams.set('v', segments[1])
  } else if (segments[0] === 'embed' && segments[1] && isValidYouTubeId(segments[1])) {
    url.pathname = '/watch'
    url.searchParams.set('v', segments[1])
  }

  const keys = Array.from(url.searchParams.keys())
  for (const key of keys) {
    if (!YOUTUBE_ALLOWED_PARAMS.has(key)) url.searchParams.delete(key)
  }
}

/**
 * @param {URL} url
 */
function normalizeXUrl (url) {
  if (!X_HOSTS.has(url.hostname)) return

  url.hostname = 'x.com'

  const segments = url.pathname.split('/').filter(Boolean)
  if (segments.length >= 4 && segments[1].toLowerCase() === 'status' && segments[3].toLowerCase() === 'mediaviewer') {
    const user = segments[0]
    const statusId = segments[2]
    if (user && statusId) {
      url.pathname = `/${user}/status/${statusId}`
      url.search = ''
    }
  }
}

/**
 * @param {URL} url
 */
function stripTrackingParams (url) {
  if (!url.search) return

  const keys = Array.from(url.searchParams.keys())
  for (const key of keys) {
    const lowerKey = key.toLowerCase()
    if (lowerKey.startsWith('utm_') || TRACKING_PARAMS.has(lowerKey)) {
      url.searchParams.delete(key)
    }
  }
}

/**
 * @param {URL} url
 */
function sortQueryParams (url) {
  if (!url.search) return

  const pairs = Array.from(url.searchParams.entries())
  pairs.sort((left, right) => {
    if (left[0] === right[0]) {
      if (left[1] === right[1]) return 0
      return left[1] < right[1] ? -1 : 1
    }
    return left[0] < right[0] ? -1 : 1
  })

  url.search = ''
  for (const [key, value] of pairs) {
    url.searchParams.append(key, value)
  }
}

/**
 * @param {URL} url
 * @param {{ maxRedirects: number, timeoutMs: number, cache?: NormalizeUrlCache }} options
 * @returns {Promise<URL>}
 */
async function expandShortUrl (url, options) {
  const cached = await getShortenerCache(url.href, options.cache)
  if (cached) return new URL(cached)

  let current = new URL(url.href)
  const visited = new Set([current.href])

  for (let i = 0; i < options.maxRedirects; i += 1) {
    if (!isHttpProtocol(current.protocol)) break

    const headResponse = await requestRedirect(current, 'HEAD', options.timeoutMs)
    let nextUrl = headResponse ? getRedirectTarget(headResponse, current) : null

    if (!nextUrl && headResponse && (headResponse.status === 400 || headResponse.status === 403 || headResponse.status === 405)) {
      const getResponse = await requestRedirect(current, 'GET', options.timeoutMs)
      nextUrl = getResponse ? getRedirectTarget(getResponse, current) : null
    }

    if (!nextUrl || !isHttpProtocol(nextUrl.protocol) || visited.has(nextUrl.href)) break

    // SSRF protection: reject redirects to internal/private IPs using comprehensive DNS-based checks
    const isSafe = await isNotSSRF(nextUrl.href)
    if (!isSafe) break

    visited.add(nextUrl.href)
    current = nextUrl
  }

  if (current.href !== url.href) {
    await setShortenerCache(url.href, current.href, options.cache)
  }

  return current
}

/**
 * @param {URL} url
 * @param {'HEAD' | 'GET'} method
 * @param {number} timeoutMs
 * @returns {Promise<Response | null>}
 */
async function requestRedirect (url, method, timeoutMs) {
  try {
    return await fetchWithTimeout(url, {
      method,
      redirect: 'manual',
      timeoutMs,
    })
  } catch (err) {
    return null
  }
}

/**
 * @param {Response} response
 * @param {URL} baseUrl
 * @returns {URL | null}
 */
function getRedirectTarget (response, baseUrl) {
  if (response.status < 300 || response.status >= 400) return null

  const location = response.headers.get('location')
  if (!location) return null

  try {
    return new URL(location, baseUrl)
  } catch {
    // Malformed redirect location, ignore it
    return null
  }
}

/**
 * @param {URL} url
 * @param {{ method: 'HEAD' | 'GET', redirect: 'manual', timeoutMs: number }} options
 * @returns {Promise<Response>}
 */
async function fetchWithTimeout (url, options) {
  const { timeoutMs, ...fetchOptions } = options
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * @param {string} href
 * @returns {string}
 */
function getShortenerCacheKey (href) {
  return `${SHORTENER_CACHE_PREFIX}${href}`
}

/**
 * @param {string} protocol
 * @returns {boolean}
 */
function isHttpProtocol (protocol) {
  return protocol === 'http:' || protocol === 'https:'
}

/**
 * @param {string} href
 * @param {NormalizeUrlCache | undefined} cache
 * @returns {string | null}
 */
async function getShortenerCache (href, cache) {
  if (!cache) return null

  try {
    const cached = await cache.get(getShortenerCacheKey(href))
    const value = cached?.item ?? cached?.value ?? cached
    if (typeof value === 'string' && value.length > 0) {
      // Validate cached value is a valid URL before returning
      try {
        const validatedUrl = new URL(value)
        return validatedUrl.href
      } catch {
        // Cached value was malformed, ignore it
        return null
      }
    }
  } catch (err) {
    // ignore cache failures
  }

  return null
}

/**
 * @param {string} href
 * @param {string} expandedHref
 * @param {NormalizeUrlCache | undefined} cache
 */
async function setShortenerCache (href, expandedHref, cache) {
  if (!cache) return

  try {
    await cache.set(getShortenerCacheKey(href), expandedHref, SHORTENER_CACHE_TTL_MS)
  } catch (err) {
    // ignore cache failures
  }
}
