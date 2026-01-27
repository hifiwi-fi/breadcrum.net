/**
 * @import { JSONSchema } from 'json-schema-to-ts'
 */
import fp from 'fastify-plugin'

export const cookieEnvSchema = /** @type {const} @satisfies {JSONSchema} */ ({
  properties: {
    COOKIE_SECRET: { type: 'string' },
    COOKIE_NAME: { type: 'string', default: 'breadcrum_token' },
  },
  required: ['COOKIE_SECRET'],
})

/**
 * This plugins adds cookie support
 *
 * @see https://github.com/fastify/fastify-cookie
 */
export default fp(async function (fastify, _) {
  fastify.register(import('@fastify/cookie'), {
    secret: fastify.config.COOKIE_SECRET,
  })
}, {
  name: 'cookie',
  dependencies: ['env'],
})
