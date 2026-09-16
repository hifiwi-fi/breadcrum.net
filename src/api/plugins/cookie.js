import fp from 'fastify-plugin'

export { cookieEnvSchema } from '../../runtime/env-fragments.js'

/**
 * This plugins adds cookie support
 *
 * @see https://github.com/fastify/fastify-cookie
 */
export default fp(async function (fastify, _) {
  const secret = fastify.config.COOKIE_SECRET
  if (secret === undefined) throw new Error('COOKIE_SECRET is required for API cookie support')
  fastify.register(import('@fastify/cookie'), {
    secret,
  })
}, {
  name: 'cookie',
  dependencies: ['env'],
})
