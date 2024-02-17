import fp from 'fastify-plugin'
import { getYTDLPMetadata } from '@breadcrum/resources/episodes/yt-dlp-api-client.js'

/**
 * This plugin adds yt-dlp fetching helpers
 */
export default fp(async function (fastify, opts) {
  fastify.decorate('getYTDLPMetadataWrapper', async function getYTDLPMetadataWrapper ({
    url,
    medium
  }) {
    const endTimer = fastify.metrics.ytdlpSeconds.startTimer()
    try {
      return await getYTDLPMetadata({
        url,
        medium,
        ytDLPEndpoint: fastify.config.YT_DLP_API_URL,
        cache: fastify.ytdlpCache
      })
    } finally {
      endTimer()
    }
  })
}, {
  name: 'yt-dlp',
  dependencies: ['env', 'prom', 'cache']
})
