import fp from 'fastify-plugin'

/**
 * This plugins adds fastify-swagger
 *
 * @see https://github.com/fastify/fastify-swagger
 */
export default fp(async function (fastify, opts) {
  fastify.register(import('@fastify/swagger'), {
    routePrefix: '/documentation',
    exposeRoute: fastify.config.ENV !== 'production',
    openapi: {
      info: {
        title: 'Test swagger',
        description: 'testing the fastify swagger api',
        version: '0.1.0'
      }
    }
  })
}, {
  name: 'swagger',
  dependencies: ['env']
})
