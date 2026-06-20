import fp from 'fastify-plugin'
import { shouldHandleSentryError } from '@breadcrum/resources/fastify-common/sentry-error-filter.js'
import { getSentryUserFromFastifyRequest } from '@breadcrum/resources/fastify-common/sentry-user-context.js'

export default fp(async function sentryPlugin (fastify) {
  if (!fastify.config.SENTRY_DSN) return

  const Sentry = await import('@sentry/node')
  fastify.addHook('onError', async (request, reply, error) => {
    if (shouldHandleSentryError(error, reply.statusCode)) {
      Sentry.withScope(scope => {
        const user = getSentryUserFromFastifyRequest(request)
        if (user) scope.setUser(user)

        Sentry.captureException(error, { mechanism: { handled: false, type: 'auto.function.fastify' } })
      })
    }
  })
}, {
  name: 'sentry',
  dependencies: ['env'],
})
