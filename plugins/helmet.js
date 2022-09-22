import fp from 'fastify-plugin'

/**
 * This plugins adds fastify/fastify-helmet
 *
 * @see https://github.com/fastify/fastify-helmet
 */
export default fp(async function (fastify, opts) {
  fastify.register(import('@fastify/helmet'), fastify.config.ENV === 'production'
    ? null
    : {
        contentSecurityPolicy: {
          directives: {
            'upgrade-insecure-requests': null
          }
        }
      })
}, {
  name: 'helmet',
  dependencies: ['env']
})
