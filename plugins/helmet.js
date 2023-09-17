import fp from 'fastify-plugin'

/**
 * This plugins adds fastify/fastify-helmet
 *
 * @see https://github.com/fastify/fastify-helmet
 */

export default fp(async function (fastify, opts) {
  // This is also customized in the ./static.js plugin
  fastify.register(import('@fastify/helmet'), {
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginEmbedderPolicy: { policy: 'credentialless' },
    contentSecurityPolicy: {
      directives: {
        'upgrade-insecure-requests': fastify.config.ENV !== 'production' ? null : [],
        'media-src': '*',
        'img-src': '*'
      }
    }
  })
}, {
  name: 'helmet',
  dependencies: ['env']
})
