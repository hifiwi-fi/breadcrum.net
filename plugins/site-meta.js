import fp from 'fastify-plugin'
import { JSDOM } from 'jsdom'
import { extractMeta } from '@breadcrum/extract-meta'

/**
 * This plugin adds site-metadata fetching helpers
 */
export default fp(async function (fastify, opts) {
  fastify.decorate('getSiteMetaData', async function getSiteMetaData ({
    url,
    initialDocument
  }) {
    const endTimer = fastify.metrics.siteMetaSeconds.startTimer()
    try {
      const cacheKey = { url }

      const cachedMeta = fastify.siteMetaCache.get(cacheKey)

      if (cachedMeta) {
        return cachedMeta
      }

      let document = initialDocument

      if (!document) {
        const html = await fastify.fetchHTML({ url })
        document = (new JSDOM(html, { url })).window.document
      }

      const metadata = extractMeta(document)

      fastify.siteMetaCache.set(cacheKey, metadata)

      return metadata
    } finally {
      endTimer()
    }
  })
}, {
  name: 'site-metadata',
  dependencies: ['env', 'prom', 'cache', 'prom', 'fetch-html']
})
