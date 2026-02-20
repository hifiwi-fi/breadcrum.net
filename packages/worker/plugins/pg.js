/**
 * @import { JSONSchema } from 'json-schema-to-ts'
 */
import fp from 'fastify-plugin'

export const pgEnvSchema = /** @type {const} @satisfies {JSONSchema} */ ({
  properties: {
    DATABASE_URL: { type: 'string', default: 'postgres://postgres@localhost/breadcrum' },
  },
  required: [],
})

/**
 * This plugins adds a postgres connection
 *
 * @see https://github.com/fastify/fastify-postgres
 */
export default fp(async function (fastify, _opts) {
  fastify.register(import('@fastify/postgres'), {
    connectionString: fastify.config.DATABASE_URL,
  })
},
{
  name: 'pg',
  dependencies: ['env'],
})
