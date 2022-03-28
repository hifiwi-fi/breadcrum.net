import fp from 'fastify-plugin'

/**
 * This plugins adds cookie support
 *
 * @see https://github.com/fastify/fastify-cookie
 */
export default fp(async function (fastify, opts) {
  fastify.register(import('fastify-cookie'), {
    secret: fastify.config.COOKIE_SECRET
  })
}, {
  name: 'cookie',
  dependencies: ['env']
})
