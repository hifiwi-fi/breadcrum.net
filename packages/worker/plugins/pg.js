/**
 * @import { EnvSchemaFragment } from '@breadcrum/resources/fastify-common/env-schema.js'
 * @import { FastifyPluginAsync } from 'fastify'
 */
import fp from 'fastify-plugin'

export const pgEnvSchema = /** @type {const} @satisfies {EnvSchemaFragment} */ ({
  properties: {
    DATABASE_URL: { type: 'string', default: 'postgres://postgres@localhost/breadcrum' },
    // pg default: 0, disabled; fail fast when PgBouncer cannot be reached
    PG_CONNECTION_TIMEOUT_MS: { type: 'integer', default: 5000 },
    // pg default: 0; only used because keepAlive is enabled below
    PG_KEEP_ALIVE_INITIAL_DELAY_MS: { type: 'integer', default: 10000 },
  },
  required: [],
})

/**
 * This plugins adds a postgres connection
 *
 * @see https://github.com/fastify/fastify-postgres
 */
/** @type {FastifyPluginAsync} */
async function pgPlugin (fastify) {
  fastify.register(import('@fastify/postgres'), {
    connectionString: fastify.config.DATABASE_URL,
    connectionTimeoutMillis: fastify.config.PG_CONNECTION_TIMEOUT_MS,
    // pg default: false; detect stale app-to-PgBouncer sockets
    keepAlive: true,
    keepAliveInitialDelayMillis: fastify.config.PG_KEEP_ALIVE_INITIAL_DELAY_MS,
  })
}

export default fp(pgPlugin, {
  name: 'pg',
  dependencies: ['env'],
})
