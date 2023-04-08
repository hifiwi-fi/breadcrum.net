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
    initialHTML // optinally pass html here if its already fetched before
  }) {
    const endTimer = fastify.metrics.archiveSeconds.startTimer()
    try {
      const cacheKey = { url }

      const cachedRBArchive = fastify.archiveCache.get(cacheKey)

      if (cachedRBArchive) {
        return cachedRBArchive
      }

      const parsedURL = new URL(url)

      if (parsedURL.hostname === 'youtube.com' || parsedURL.hostname.endsWith('.youtube.com')) {
        const metadata = await fastify.getYTDLPMetadata({ url, medium: 'video' })

        return {
          title: metadata.title,
          textContent: metadata.description,
          length: metadata.description.length,
          byline: metadata.channel,
          dir: 'ltr',
          siteName: metadata?.uploader_url?.replace(/^https?:\/\//, '') || metadata?.channel_url?.replace(/^https?:\/\//, '') || 'youtube.com',
          lang: metadata.language
        }
      } else {
        const html = initialHTML ?? await fastify.fetchHTML({ url })
        const { document } = (new JSDOM(html, { url })).window
        const reader = new Readability(document)
        const article = reader.parse()
        if (article) {
          const dpWindow = new JSDOM('').window
          const DOMPurify = createDOMPurify(dpWindow)
          article.content = DOMPurify.sanitize(article.content)

          fastify.siteMetaCache.set(cacheKey, article)

          return article
        } else {
          throw new Error(`Extracting readability archive returned null for ${url}`)
        }
      }
    } finally {
      endTimer()
    }
  })
}, {
  name: 'extract-archive',
  dependencies: ['env', 'prom', 'cache', 'prom', 'fetch-html']
})
