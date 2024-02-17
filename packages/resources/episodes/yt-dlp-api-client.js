import { request as undiciRequest } from 'undici'

// TODO: move the shared elements of this back into breadcrum

export async function getYTDLPMetadata ({
  url,
  medium,
  ytDLPEndpoint,
  cache
}) {
  const cacheKey = {
    url,
    medium
  }
  const cachedMeta = await cache?.get(cacheKey)

  if (cachedMeta) {
    return cachedMeta
  }

  const formatOpts = getFormatArg(medium)
  const requestURL = new URL(ytDLPEndpoint)

  requestURL.searchParams.set('url', url)
  requestURL.searchParams.set('format', formatOpts)
  requestURL.pathname = 'info'

  const response = await undiciRequest(requestURL, {
    headers: {
      Accept: 'application/json',
      Authorization: 'Basic ' + btoa(requestURL.username + ':' + requestURL.password)
    },
    autoSelectFamily: true
  })

  if (response.statusCode !== 200) {
    const text = await response.body.text()
    throw new Error(`yt-dlp error${response.statusCode}: ` + text)
  }

  const metadata = await response.body.json()

  await cache?.set?.(cacheKey, metadata)

  return metadata
}

const videoFormat = 'best[ext=mp4]/best[ext=mov]/mp4/mov'
const audioFormat = 'ba[ext=m4a]/ba[ext=mp4]/ba[ext=mp3]/mp3/m4a'

function getFormatArg (medium) {
  if (!['video', 'audio'].includes(medium)) throw new Error('format must be video or audio')

  const formatOpts = medium === 'video'
    ? [videoFormat, audioFormat].join('/')
    : medium === 'audio'
      ? [audioFormat, videoFormat].join('/')
      : null

  if (!formatOpts) throw new Error('No format options generated. Please report this bug')

  return formatOpts
}
