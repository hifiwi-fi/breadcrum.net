import fp from 'fastify-plugin'

/**
 * @import { PgClient } from '@breadcrum/resources/types/pg-client.js'
 */

/**
 * @typedef {PgClient} PgClientAlias
 */

/**
 * This plugins adds a postgres connection
 *
 * @see https://github.com/fastify/fastify-postgres
 */
export default fp(async function (fastify, _) {
  fastify.register(import('@fastify/postgres'), {
    connectionString: fastify.config.DATABASE_URL,
  })
},
{
  name: 'pg',
  dependencies: ['env'],
})
