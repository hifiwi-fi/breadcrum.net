import fp from 'fastify-plugin'

/**
 * This plugins adds a postgres connection
 *
 * @see https://github.com/fastify/fastify-postgres
 */
export default fp(async function (fastify, opts) {
  fastify.register(import('fastify-postgres'), {
    connectionString: fastify.config.PG_CONNECTION_STRING
  })
},
{
  name: 'pg',
  dependencies: ['env']
})
