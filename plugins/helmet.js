import fp from 'fastify-plugin'

/**
 * This plugins adds fastify/fastify-helmet
 *
 * @see https://github.com/fastify/fastify-helmet
 */

export default fp(async function (fastify, opts) {
  const options = {
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginEmbedderPolicy: { policy: 'credentialless' },
    contentSecurityPolicy: {
      directives: {
        'media-src': '*',
        'img-src': '*'
      }
    }
  }

  if (fastify.config.ENV !== 'production') {
    options.contentSecurityPolicy.directives['upgrade-insecure-requests'] = null
  }

  fastify.register(import('@fastify/helmet'), options)
}, {
  name: 'helmet',
  dependencies: ['env']
})
