import fp from 'fastify-plugin'
import { JSDOM } from 'jsdom'
import { Readability } from '@mozilla/readability'
import createDOMPurify from 'dompurify'

/**
 * This plugin adds readability-extract fetching helpers
 */
export default fp(async function (fastify, opts) {
  fastify.decorate('extractArchive', async function extractArchive ({
    url,
    initialDocument
  }) {
    const endTimer = fastify.metrics.archiveSeconds.startTimer()
    try {
      const cacheKey = { url }

      const cachedRBArchive = fastify.archiveCache.get(cacheKey)

      if (cachedRBArchive) {
        return cachedRBArchive
      }

      let document = initialDocument

      if (!document) {
        const html = await fastify.fetchHTML({ url })
        document = (new JSDOM(html, { url })).window.document
      }

      const reader = new Readability(document)
      const article = reader.parse()

      if (!article) return null

      const dpWindow = new JSDOM('').window
      const DOMPurify = createDOMPurify(dpWindow)
      article.content = DOMPurify.sanitize(article.content)

      fastify.siteMetaCache.set(cacheKey, article)

      return article
    } finally {
      endTimer()
    }
  })
}, {
  name: 'extract-archive',
  dependencies: ['env', 'prom', 'cache', 'prom', 'fetch-html']
})
