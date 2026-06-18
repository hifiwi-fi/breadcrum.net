import fp from 'fastify-plugin'

export default fp(async function sentryPlugin (fastify) {
  if (!fastify.config.SENTRY_DSN) return

  const Sentry = await import('@sentry/node')
  Sentry.setupFastifyErrorHandler(fastify, {
    shouldHandleError (error, _request, reply) {
      const errorStatusCode = getErrorStatusCode(error)
      if (errorStatusCode) return errorStatusCode >= 500

      // Fastify may not have assigned the final error response status yet, so a
      // reply still marked 2xx on the error path should be reported.
      return reply.statusCode >= 500 || reply.statusCode <= 299
    },
  })
}, {
  name: 'sentry',
  dependencies: ['env'],
})

/**
 * @param {Error} error
 * @returns {number | undefined}
 */
function getErrorStatusCode (error) {
  const httpError = /** @type {Error & { status?: unknown, statusCode?: unknown }} */ (error)
  const statusCode = httpError.statusCode ?? httpError.status

  return typeof statusCode === 'number' ? statusCode : undefined
}
