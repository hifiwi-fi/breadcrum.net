import fp from 'fastify-plugin'
import { getYTDLPMetadata } from '@breadcrum/resources/episodes/yt-dlp-api-client.js'

/**
 * This plugin adds yt-dlp fetching helpers
 */
export default fp(async function (fastify, _opts) {
  fastify.decorate(
    'getYTDLPMetadataWrapper',
    async function getYTDLPMetadataWrapper ({
      url,
      medium,
      attempt = 0,
    }) {
      const startTime = performance.now()
      try {
        return await getYTDLPMetadata({
          url,
          medium,
          attempt,
          ytDLPEndpoint: fastify.config.YT_DLP_API_URL,
          cache: fastify.ytdlpCache,
        })
      } finally {
        const duration = (performance.now() - startTime) / 1000 // Convert to seconds
        fastify.otel.ytdlpSeconds.record(duration)
      }
    })
}, {
  name: 'yt-dlp',
  dependencies: ['env', 'otel-metrics', 'cache'],
})
