import { request as undiciRequest } from 'undici'

// TODO: move the shared elements of this back into breadcrum

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
    autoSelectFamily: true,
  })

  if (response.statusCode !== 200) {
    const text = await response.body.text()
    throw new Error(`yt-dlp error${response.statusCode}: ` + text)
  }

  const metadata = await response.body.json()

  await cache?.set?.(cacheKey, metadata)

  return metadata
}

function getFormatArg (medium) {
  if (!['video', 'audio'].includes(medium)) throw new Error('format must be video or audio')

  return medium
}
