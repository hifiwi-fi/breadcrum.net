import fp from 'fastify-plugin'

/**
 * This plugins adds fastify/fastify-helmet
 *
 * @see https://github.com/fastify/fastify-helmet
 */

export default fp(async function (fastify, opts) {
  // This is also customized in the ./static.js plugin
  fastify.register(import('@fastify/helmet'), {
    contentSecurityPolicy: {
      directives: {
        'upgrade-insecure-requests': fastify.config.ENV !== 'production' ? null : [],
        'connect-src': ["'self'", 'https://*.browser-intake-datadoghq.com'], // REMOVE if not using DD
        'worker-src': ["'self'", 'blob:'] // REMOVE if not using DD
      }
    }
  })
}, {
  name: 'helmet',
  dependencies: ['env']
})
