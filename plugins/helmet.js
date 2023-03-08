import fp from 'fastify-plugin'

/**
 * This plugins adds fastify/fastify-helmet
 *
 * @see https://github.com/fastify/fastify-helmet
 */

const defaultDirectives = {
  'media-src': '*'
}

export default fp(async function (fastify, opts) {
  fastify.register(import('@fastify/helmet'), fastify.config.ENV === 'production'
    ? {
        contentSecurityPolicy: {
          directives: {
            ...defaultDirectives
          }
        }
      }
    : {
        contentSecurityPolicy: {
          directives: {
            ...defaultDirectives,
            'upgrade-insecure-requests': null
          }
        }
      })
}, {
  name: 'helmet',
  dependencies: ['env']
})
