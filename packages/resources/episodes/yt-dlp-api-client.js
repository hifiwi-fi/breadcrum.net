import { request as undiciRequest } from 'undici'

// TODO: move the shared elements of this back into breadcrum

// TODO: Derive a client from open api types in yt-dlp-api

/**
 * @typedef {'video' | 'audio' } MediumTypes
 */

/**
 * @typedef {Object} YTDLPMetadata
 * @property {string} url - The URL of the resource (required, format: uri).
 * @property {number|null} [filesize_approx] - Approximate file size (nullable).
 * @property {number|null} [duration] - Duration of the resource (nullable).
 * @property {string|null} [channel] - Channel name (nullable).
 * @property {string|null} [title] - Title of the resource (nullable).
 * @property {string|null} [ext] - File extension (nullable).
 * @property {string|null} [_type] - Resource type (nullable).
 * @property {string|null} [description] - Description of the resource (nullable).
 * @property {string|null} [uploader_url] - URL of the uploader (nullable, format: uri).
 * @property {string|null} [channel_url] - URL of the channel (nullable, format: uri).
 * @property {string|null} [thumbnail] - Thumbnail URL (nullable, format: uri).
 * @property {string|null} [live_status] - Live status of the resource (nullable).
 * @property {number|null} [release_timestamp] - Release timestamp (nullable).
 */

/**
 * [getYTDLPMetadata description]
 * @param  {object} params
 * @param  {string} params.url           the url of the video
 * @param  {MediumTypes} params.medium        the desuired filetype
 * @param  {string} params.ytDLPEndpoint The configured yt-dlp-api endpoint
 * @param  {Number} params.attempt      Cache busting attemp number
 * @param  {{
      get(key: object): Promise<any>;
      set(key: object, value: any, ttl?: number): Promise<void>;
    }} params.cache         The cache instance
 * @return {Promise<YTDLPMetadata>}                       metadata object
 */
export async function getYTDLPMetadata ({
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
    const text = await response.body.text()
    throw new Error(`yt-dlp error${response.statusCode}: ` + text)
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
