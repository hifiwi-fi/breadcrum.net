import fp from 'fastify-plugin'

/**
 * @import { PgClient } from '#resources/types/pg-client.js'
 */

/**
 * @typedef {PgClient} PgClientAlias
 */

export { pgEnvSchema } from '../../runtime/env-fragments.js'

/**
 * This plugins adds a postgres connection
 *
 * @see https://github.com/fastify/fastify-postgres
 */
export default fp(async function (fastify, _) {
  fastify.register(import('@fastify/postgres'), {
    connectionString: fastify.config.DATABASE_URL,
    connectionTimeoutMillis: fastify.config.PG_CONNECTION_TIMEOUT_MS,
    // pg default: false; detect stale app-to-PgBouncer sockets
    keepAlive: true,
    keepAliveInitialDelayMillis: fastify.config.PG_KEEP_ALIVE_INITIAL_DELAY_MS,
    pipeline: true,
  })
},
{
  name: 'pg',
  dependencies: ['env'],
})
