import fp from 'fastify-plugin'
import { request as undiciRequest } from 'undici'
import { JSDOM } from 'jsdom'
import { extractMeta } from '@breadcrum/extract-meta'

// Sorry newspapers, no cheating
const GOOGLE_BOT_UA = 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Googlebot/2.1; +http://www.google.com/bot.html) Chrome/W.X.Y.Z Safari/537.36'

/**
 * This plugin adds site-metadata fetching helpers
 */
export default fp(async function (fastify, opts) {
  fastify.decorate('getSiteMetaData', async function getSiteMetaData ({
    url
  }) {
    const endTimer = fastify.metrics.siteMetaSeconds.startTimer()
    try {
      const requestURL = new URL(url)

      const cacheKey = { url }

      const cachedMeta = fastify.siteMetaCache.get(cacheKey)

      if (cachedMeta) {
        return cachedMeta
      }

      const response = await undiciRequest(requestURL, {
        headers: {
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'user-agent': GOOGLE_BOT_UA
        },
        maxRedirections: 3
      })

      if (response.statusCode > 299) {
        const text = await response.body.text()
        throw new Error(`site metadata error (${response.statusCode}): ` + text)
      }

      const html = await response.body.text()

      const { document } = (new JSDOM(html, { url })).window
      const metadata = extractMeta(document)

      fastify.siteMetaCache.set(cacheKey, metadata)

      return metadata
    } finally {
      endTimer()
    }
  })
}, {
  name: 'site-metadata',
  dependencies: ['env', 'prom', 'cache', 'prom']
})
