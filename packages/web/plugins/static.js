import fp from 'fastify-plugin'
import path from 'path'

const __dirname = import.meta.dirname

const generatedContentTypes = new Map([
  ['/robots.txt', 'text/plain; charset=utf-8'],
  ['/opensearch.xml', 'application/opensearchdescription+xml; charset=utf-8'],
  ['/giscus.json', 'application/json; charset=utf-8'],
  ['/manifest.webmanifest', 'application/manifest+json; charset=utf-8'],
  ['/service-worker.js', 'application/javascript; charset=utf-8'],
  ['/feed.json', 'application/feed+json; charset=utf-8'],
  ['/feed.xml', 'application/atom+xml; charset=utf-8'],
  ['/sitemap.xml', 'application/xml; charset=utf-8'],
])

/**
 * This plugins adds fastify-static
 *
 * @see https://github.com/fastify/fastify-static
 */
export default fp(async function (fastify, _) {
  const staticOpts = {
    redirect: true,
    maxAge: fastify.config.ENV === 'production' ? 600000 : 0,
    lastModified: true,
  }

  fastify.addHook('onSend', async (request, reply, payload) => {
    const contentType = generatedContentTypes.get(new URL(request.url, 'http://localhost').pathname)
    if (contentType) reply.header('content-type', contentType)
    return payload
  })

  fastify.register(import('@fastify/static'), {
    logLevel: 'silent',
    root: path.join(__dirname, '../public'),
    prefix: '/',
    ...staticOpts,
  })
}, {
  name: 'static',
  dependencies: ['compress', 'env', 'helmet'],
})
