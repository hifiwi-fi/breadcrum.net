import fp from 'fastify-plugin'

/**
 * This plugins adds fastify-swagger
 *
 * @see https://github.com/fastify/fastify-swagger
 */
export default fp(async function (fastify, _) {
  fastify.register(import('@fastify/swagger'), {
    openapi: {
      info: {
        title: 'Breadcrum API',
        description: 'Breadcrum\'s (unstable) API',
        version: '0.0.1'
      }
    }
  })

  if (fastify.config.SWAGGER) {
    fastify.register(import('@fastify/swagger-ui'), {
      routePrefix: '/openapi'
    })
  }
}, {
  name: 'swagger',
  dependencies: ['env']
})
