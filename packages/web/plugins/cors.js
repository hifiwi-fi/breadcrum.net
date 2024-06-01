import fp from 'fastify-plugin'

/**
 * This plugins adds fastify-cors
 *
 * @see https://github.com/fastify/fastify-cors
 */
export default fp(async function (fastify, _) {
  fastify.register(import('@fastify/cors'), {
    origin: ['http://localhost:3000', 'https://breadcrum.net'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
  })
}, {
  name: 'cors',
  dependencies: ['env']
})
