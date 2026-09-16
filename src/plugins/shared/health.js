import fp from 'fastify-plugin'

/**
 * This plugins adds smartiniOnGitHub/fastify-healthcheck
 *
 * @see https://github.com/smartiniOnGitHub/fastify-healthcheck
 */
export default fp(async function (fastify) {
  fastify.register(import('fastify-healthcheck'), { logLevel: 'silent' })
}, {
  dependencies: ['env', 'pg'],
  name: 'health',
})
