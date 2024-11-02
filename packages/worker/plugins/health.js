import fp from 'fastify-plugin'

/**
 * This plugins adds smartiniOnGitHub/fastify-healthcheck
 *
 * @see https://github.com/smartiniOnGitHub/fastify-healthcheck
 */
export default fp(async function (fastify, _opts) {
  fastify.register(import('fastify-healthcheck'))
}, {
  name: 'health',
})
