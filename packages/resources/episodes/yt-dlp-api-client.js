import { request as undiciRequest } from 'undici'
import { isYouTubeUrl } from '@bret/is-youtube-url'

// TODO: move the shared elements of this back into breadcrum

// TODO: Derive a client from open api types in yt-dlp-api

/**
 * @typedef {Object} YTDLPMetaKeyParams
 * @property {string} url - The URL of the YTDLP source.
 * @property {string} medium - The medium of the YTDLP source.
 * @property {number} attempt - Cache busting attempt key.
 */

/**
 * Generates a YTDLP meta key based on the provided parameters.
 *
 * @param {YTDLPMetaKeyParams} params - The parameters for generating the YTDLP meta key.
 * @returns {string} The generated YTDLP meta key.
 */
export function getYTDLPMetaKey ({
  url,
  medium,
  attempt = 0,
}) {
  return [
    'meta',
    url,
    medium,
    attempt,
  ].join(':')
}

export const ytdlpTtl = 1000 * 60 * 20 // 20 mins

/**
 * @typedef {Object} YTDLPMetadata
 * @property {string} url - The URL of the resource (required, format: uri).
 * @property {number} [filesize_approx] - Approximate file size (nullable).
 * @property {number} [duration] - Duration of the resource (nullable).
 * @property {string} [channel] - Channel name (nullable).
 * @property {string} [title] - Title of the resource (nullable).
 * @property {string} [ext] - File extension (nullable).
 * @property {string} [_type] - Resource type (nullable).
 * @property {string} [description] - Description of the resource (nullable).
 * @property {string} [uploader_url] - URL of the uploader (nullable, format: uri).
 * @property {string} [channel_url] - URL of the channel (nullable, format: uri).
 * @property {string} [thumbnail] - Thumbnail URL (nullable, format: uri).
 * @property {string} [live_status] - Live status of the resource (nullable).
 * @property {number} [release_timestamp] - Release timestamp (nullable).
 */

/**
 * @typedef {'video' | 'audio' } MediumTypes
 */

/**
 * [getYTDLPMetadata description]
 * @param  {object} params
 * @param  {string} params.url           the url of the video
 * @param  {MediumTypes} params.medium        the desired filetype
 * @param  {string} params.ytDLPEndpoint The configured yt-dlp-api endpoint
 * @param  {Number} params.attempt      Cache busting attempt number
 * @param  {{
      get(key: object): Promise<any>;
      set(key: object, value: any, ttl?: number): Promise<void>;
    }} params.cache         The cache instance
 * @param  {Number} [params.maxRetries] Maximum number of retries (default: 3 for YouTube, 0 for others)
 * @param  {Number} [params.retryDelayMs] Delay between retries in milliseconds (default: 5000)
 * @return {Promise<YTDLPMetadata>}                       metadata object
 */
export async function getYTDLPMetadata ({
  url,
  medium,
  ytDLPEndpoint,
  attempt = 0,
  cache,
  maxRetries,
  retryDelayMs = 5000,
}) {
  const parsedUrl = new URL(url)
  const isYouTube = isYouTubeUrl(parsedUrl)

  // Default retry behavior: YouTube gets 3 retries, others get 0
  const effectiveMaxRetries = maxRetries !== undefined ? maxRetries : (isYouTube ? 3 : 0)

  let lastError

  for (let retryAttempt = 0; retryAttempt <= effectiveMaxRetries; retryAttempt++) {
    try {
      return await getYTDLPMetadataAttempt({
        url,
        medium,
        ytDLPEndpoint,
        attempt: attempt + retryAttempt,
        cache,
      })
    } catch (err) {
      lastError = err
      const isLastAttempt = retryAttempt === effectiveMaxRetries

      if (!isLastAttempt) {
        // Wait before next retry
        await new Promise(resolve => setTimeout(resolve, retryDelayMs))
      }
    }
  }

  // All retries exhausted, throw the last error
  throw lastError
}

/**
 * Internal function to attempt a single getYTDLPMetadata request
 * @param  {object} params
 * @param  {string} params.url           the url of the video
 * @param  {MediumTypes} params.medium        the desired filetype
 * @param  {string} params.ytDLPEndpoint The configured yt-dlp-api endpoint
 * @param  {Number} params.attempt      Cache busting attempt number
 * @param  {{
      get(key: object): Promise<any>;
      set(key: object, value: any, ttl?: number): Promise<void>;
    }} params.cache         The cache instance
 * @return {Promise<YTDLPMetadata>}                       metadata object
 */
async function getYTDLPMetadataAttempt ({
  url,
  medium,
  ytDLPEndpoint,
  attempt = 0,
  cache,
}) {
  const cacheKey = {
    url,
    medium,
    attempt,
  }
  const cachedMeta = await cache?.get(cacheKey)

  if (cachedMeta) {
    return cachedMeta
  }

  const formatOpts = getFormatArg(medium)
  const requestURL = new URL(ytDLPEndpoint)

  requestURL.searchParams.set('url', url)
  requestURL.searchParams.set('format', formatOpts)
  requestURL.pathname = 'unified'

  const response = await undiciRequest(requestURL, {
    headers: {
      Accept: 'application/json',
      Authorization: 'Basic ' + btoa(requestURL.username + ':' + requestURL.password),
    },
    // @ts-ignore
    autoSelectFamily: true,
  })

  if (response.statusCode !== 200) {
    /**
      * @type {{
      *  code: number,
      *  name: string,
      *  description: string
      * }}
      */
    const body = /** @type {any} */ (await response.body.json())
    throw new Error(`yt-dlp-api error: ${body.description}`)
  }

  const metadata = /** @type {YTDLPMetadata} */ (await response.body.json())

  await cache?.set?.(cacheKey, metadata)

  return metadata
}

/**
 * [getFormatArg description]
 * @param  {MediumTypes} medium
 * @return {MediumTypes}
 */
function getFormatArg (medium) {
  if (!['video', 'audio'].includes(medium)) throw new Error('format must be video or audio')

  return medium
}
