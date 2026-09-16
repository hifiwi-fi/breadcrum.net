import fp from 'fastify-plugin'
import { getYTDLPMetadata } from '#resources/episodes/yt-dlp-api-client.js'

export { ytDlpEnvSchema } from '#config/env-fragments.js'

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
      parentRequestId,
    }) {
      const startTime = performance.now()
      try {
        return await getYTDLPMetadata({
          url,
          medium,
          attempt,
          parentRequestId,
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
