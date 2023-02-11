import fp from 'fastify-plugin'
import { request as undiciRequest } from 'undici'

/**
 * This plugin adds yt-dlp fetching helpeers
 */
export default fp(async function (fastify, opts) {
  fastify.decorate('getYTDLPMetadata', async function getYTDLPMetadata ({
    url,
    medium
  }) {
    const endTimer = fastify.metrics.ytdlpSeconds.startTimer()
    try {
      const formatOpts = getFormatArg(medium)
      const requestURL = new URL(fastify.config.YT_DLP_API_URL)
      requestURL.searchParams.set('url', url)
      requestURL.searchParams.set('format', formatOpts)
      requestURL.pathname = 'info'

      const response = await undiciRequest(requestURL, {
        headers: {
          Accept: 'application/json',
          Authorization: 'Basic ' + btoa(requestURL.username + ':' + requestURL.password)
        }
      })

      if (response.statusCode !== 200) {
        const text = await response.body.text()
        throw new Error('yt-dlp error: ' + text)
      }

      const metadata = await response.body.json()

      // TODO: cache this in memMetaCache

      return metadata
    } finally {
      endTimer()
    }
  })
}, {
  name: 'yt-dlp',
  dependencies: ['env', 'prom']
})

const videoFormat = 'best[ext=mp4]/best[ext=mov]/mp4/mov'
const audioFormat = 'ba[ext=m4a]/ba[ext=mp4]/ba[ext=mp3]/mp3/m4a'

export function getFormatArg (medium) {
  if (!['video', 'audio'].includes(medium)) throw new Error('format must be video or audio')

  const formatOpts = medium === 'video'
    ? [videoFormat, audioFormat].join('/')
    : medium === 'audio'
      ? [audioFormat, videoFormat].join('/')
      : null

  if (!formatOpts) throw new Error('No format options generated. Please report this bug')

  return formatOpts
}

export function getFileKey ({
  userId,
  episodeId,
  sourceUrl,
  type,
  medium
}) {
  return [
    'file',
    userId,
    episodeId,
    sourceUrl,
    type,
    medium
  ].join(':')
}
