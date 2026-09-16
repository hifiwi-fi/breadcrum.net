import { request as undiciRequest } from 'undici'

/**
 * @typedef {Object} EmbedResult
 * @property {string | null | undefined} [type]
 * @property {string | null | undefined} [provider_name]
 * @property {string | null | undefined} [provider_url]
 * @property {string | null | undefined} [html]
 * @property {number | string | null | undefined} [width]
 * @property {number | string | null | undefined} [height]
 * @property {string | null | undefined} [thumbnail_url]
 * @property {string | null | undefined} [title]
 */

/**
 * @typedef {Object} OembedProvider
 * @property {string} name
 * @property {string} endpoint
 * @property {RegExp[]} urlPatterns
 * @property {string | undefined} [providerUrl]
 */

export const oembedCacheTtl = 1000 * 60 * 60 * 24

/**
 * Providers that require fetching from an oEmbed endpoint.
 * YouTube and Vimeo are NOT here — they use API-side templates instead.
 * @type {OembedProvider[]}
 */
export const defaultOembedProviders = [
  {
    name: 'SoundCloud',
    endpoint: 'https://soundcloud.com/oembed',
    providerUrl: 'https://soundcloud.com',
    urlPatterns: [
      /^https?:\/\/(www\.)?soundcloud\.com\//,
    ],
  },
  {
    name: 'Spotify',
    endpoint: 'https://open.spotify.com/oembed',
    providerUrl: 'https://open.spotify.com',
    urlPatterns: [
      /^https?:\/\/open\.spotify\.com\//,
    ],
  },
  {
    name: 'Twitter',
    endpoint: 'https://publish.twitter.com/oembed',
    providerUrl: 'https://twitter.com',
    urlPatterns: [
      /^https?:\/\/(www\.)?(twitter\.com|x\.com)\/.+\/status\//,
    ],
  },
  {
    name: 'Rumble',
    endpoint: 'https://rumble.com/api/Media/oembed.json',
    providerUrl: 'https://rumble.com',
    urlPatterns: [
      /^https?:\/\/(www\.)?rumble\.com\/.+\.html/,
    ],
  },
  {
    name: 'Bluesky',
    endpoint: 'https://embed.bsky.app/oembed',
    providerUrl: 'https://bsky.app',
    urlPatterns: [
      /^https?:\/\/bsky\.app\/profile\/.+\/post\//,
    ],
  },
]

/**
 * @param {string} url
 * @returns {string}
 */
export function getEmbedCacheKey (url) {
  return `oembed:${url}`
}

/**
 * Fetch oEmbed data for a URL from a known provider endpoint.
 * Only used for providers that require fetched data (SoundCloud, Spotify, Twitter).
 * YouTube and Vimeo embeds are generated API-side via generateTemplateHtml().
 *
 * @param {object} params
 * @param {string} params.url
 * @param {OembedProvider[]} [params.oembedProviders]
 * @param {number} [params.maxWidth]
 * @param {number} [params.maxHeight]
 * @param {{ get: (key: string) => Promise<unknown>, set: (key: string, value: EmbedResult | null, ttlMs: number) => Promise<void> | void } | undefined} [params.cache]
 * @param {number} [params.cacheTtlMs]
 * @returns {Promise<EmbedResult | null>}
 */
export async function resolveEmbed ({
  url,
  oembedProviders = defaultOembedProviders,
  maxWidth,
  maxHeight,
  cache,
  cacheTtlMs = oembedCacheTtl,
}) {
  let parsedUrl
  try {
    parsedUrl = new URL(url)
  } catch {
    return null
  }

  const cacheKey = cache ? getEmbedCacheKey(parsedUrl.toString()) : null
  if (cache && cacheKey) {
    const cached = await cache.get(cacheKey)
    const cachedValue = unwrapCacheValue(cached)
    if (cachedValue !== undefined) return cachedValue
  }

  const provider = findOembedProvider(parsedUrl, oembedProviders)
  if (!provider) {
    if (cache && cacheKey) await cache.set(cacheKey, null, cacheTtlMs)
    return null
  }

  let oembed = null
  try {
    oembed = await fetchOembed({
      provider,
      url: parsedUrl.toString(),
      maxWidth,
      maxHeight,
    })
  } catch {
    oembed = null
  }

  if (cache && cacheKey) await cache.set(cacheKey, oembed, cacheTtlMs)

  return oembed
}

/**
 * @param {unknown} cached
 * @returns {EmbedResult | null | undefined}
 */
function unwrapCacheValue (cached) {
  if (cached == null) return cached

  if (typeof cached === 'object') {
    /** @type {{ item?: EmbedResult | null, value?: EmbedResult | null }} */
    const maybeCached = cached
    if (Object.prototype.hasOwnProperty.call(maybeCached, 'item')) {
      return maybeCached.item
    }
    if (Object.prototype.hasOwnProperty.call(maybeCached, 'value')) {
      return maybeCached.value
    }
  }

  return /** @type {EmbedResult | null | undefined} */ (cached)
}

/**
 * @param {URL} url
 * @param {OembedProvider[]} providers
 * @returns {OembedProvider | undefined}
 */
function findOembedProvider (url, providers) {
  const urlString = url.toString()
  return providers.find(provider => provider.urlPatterns.some((pattern) => pattern.test(urlString)))
}

/**
 * @param {object} params
 * @param {OembedProvider} params.provider
 * @param {string} params.url
 * @param {number} [params.maxWidth]
 * @param {number} [params.maxHeight]
 * @returns {Promise<EmbedResult | null>}
 */
async function fetchOembed ({ provider, url, maxWidth, maxHeight }) {
  const requestUrl = new URL(provider.endpoint)
  requestUrl.searchParams.set('url', url)
  requestUrl.searchParams.set('format', 'json')
  if (maxWidth) requestUrl.searchParams.set('maxwidth', `${maxWidth}`)
  if (maxHeight) requestUrl.searchParams.set('maxheight', `${maxHeight}`)

  const response = await undiciRequest(requestUrl, {
    headers: {
      Accept: 'application/json',
    },
    // @ts-expect-error - undici's autoSelectFamily is not typed here
    autoSelectFamily: true,
  })

  if (response.statusCode < 200 || response.statusCode >= 300) {
    return null
  }

  const bodyText = await response.body.text()
  /** @type {Record<string, unknown>} */
  let payload
  try {
    payload = JSON.parse(bodyText)
  } catch {
    return null
  }

  const normalized = normalizeOembedPayload({ payload, provider })
  if (!normalized?.html) return null
  return normalized
}

/**
 * @param {object} params
 * @param {Record<string, unknown>} params.payload
 * @param {OembedProvider} params.provider
 * @returns {EmbedResult | null}
 */
function normalizeOembedPayload ({ payload, provider }) {
  if (payload == null || typeof payload !== 'object' || Array.isArray(payload)) return null

  /** @type {EmbedResult & Record<string, unknown>} */
  const embed = { ...payload }

  if (embed.provider_name == null) embed.provider_name = provider.name
  if (embed.provider_url == null && provider.providerUrl) embed.provider_url = provider.providerUrl

  if (typeof embed.html !== 'string' || embed.html.trim().length === 0) {
    return null
  }

  if (typeof embed.width === 'string') {
    const width = Number.parseInt(embed.width, 10)
    embed.width = Number.isNaN(width) ? null : width
  }
  if (typeof embed.height === 'string') {
    const height = Number.parseInt(embed.height, 10)
    embed.height = Number.isNaN(height) ? null : height
  }

  return embed
}

/**
 * Extract a YouTube video ID from a URL.
 *
 * @param {URL} url
 * @returns {string | null}
 */
export function extractYouTubeVideoId (url) {
  const host = url.hostname.replace(/^www\./, '')

  if (host === 'youtu.be') {
    return url.pathname.replace(/^\//, '') || null
  }

  if (host === 'youtube.com' || host === 'm.youtube.com') {
    if (url.pathname === '/watch') {
      return url.searchParams.get('v')
    }
    if (url.pathname.startsWith('/shorts/')) {
      return url.pathname.split('/')[2] || null
    }
    if (url.pathname.startsWith('/embed/')) {
      return url.pathname.split('/')[2] || null
    }
  }

  return null
}

/**
 * Extract a Vimeo video ID from a URL.
 *
 * @param {URL} url
 * @returns {string | null}
 */
export function extractVimeoVideoId (url) {
  const host = url.hostname.replace(/^www\./, '')
  if (host !== 'vimeo.com' && host !== 'player.vimeo.com') return null

  const parts = url.pathname.split('/').filter(Boolean)
  const candidate = parts[parts.length - 1]
  if (!candidate || !/^\d+$/.test(candidate)) return null

  return candidate
}

/**
 * Extract a Dailymotion video ID from a URL.
 *
 * @param {URL} url
 * @returns {string | null}
 */
export function extractDailymotionVideoId (url) {
  const host = url.hostname.replace(/^www\./, '')
  if (host !== 'dailymotion.com' && host !== 'dai.ly') return null

  if (host === 'dai.ly') {
    return url.pathname.replace(/^\//, '') || null
  }

  if (url.pathname.startsWith('/video/')) {
    const id = url.pathname.split('/')[2]
    return id || null
  }

  return null
}

/**
 * Generate embed HTML from a URL for well-known providers (YouTube, Vimeo, Dailymotion).
 * Returns null if the URL doesn't match a known template provider.
 *
 * @param {string} url
 * @returns {{ html: string, provider_name: string, provider_url: string, type: string, width: number, height: number } | null}
 */
export function generateTemplateEmbed (url) {
  let parsedUrl
  try {
    parsedUrl = new URL(url)
  } catch {
    return null
  }

  const youtubeId = extractYouTubeVideoId(parsedUrl)
  if (youtubeId) {
    const safeId = encodeURIComponent(youtubeId)
    return {
      provider_name: 'YouTube',
      provider_url: 'https://www.youtube.com',
      type: 'video',
      width: 640,
      height: 360,
      html: `<iframe width="640" height="360" src="https://www.youtube-nocookie.com/embed/${safeId}" title="YouTube video player" frameborder="0" referrerpolicy="origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`,
    }
  }

  const vimeoId = extractVimeoVideoId(parsedUrl)
  if (vimeoId) {
    return {
      provider_name: 'Vimeo',
      provider_url: 'https://vimeo.com',
      type: 'video',
      width: 640,
      height: 360,
      html: `<iframe src="https://player.vimeo.com/video/${vimeoId}" width="640" height="360" frameborder="0" referrerpolicy="origin" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`,
    }
  }

  const dailymotionId = extractDailymotionVideoId(parsedUrl)
  if (dailymotionId) {
    const safeId = encodeURIComponent(dailymotionId)
    return {
      provider_name: 'Dailymotion',
      provider_url: 'https://www.dailymotion.com',
      type: 'video',
      width: 640,
      height: 360,
      html: `<iframe src="https://geo.dailymotion.com/player.html?video=${safeId}" width="640" height="360" frameborder="0" referrerpolicy="origin" allow="fullscreen; picture-in-picture; web-share" allowfullscreen loading="lazy"></iframe>`,
    }
  }

  return null
}
