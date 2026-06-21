/**
 * @import { JSONSchema } from 'json-schema-to-ts'
 */
import fp from 'fastify-plugin'
import { shouldHandleSentryError } from '@breadcrum/resources/fastify-common/sentry-error-filter.js'

export const sentryEnvSchema = /** @type {const} @satisfies {JSONSchema} */ ({
  properties: {
    SENTRY_DSN: { type: 'string' },
    SENTRY_RELEASE: { type: 'string' },
  },
  required: [],
})

export default fp(async function sentryPlugin (fastify) {
  if (!fastify.config.SENTRY_DSN) return

  const Sentry = await import('@sentry/node')
  fastify.addHook('onError', async (_request, reply, error) => {
    if (shouldHandleSentryError(error, reply.statusCode)) {
      Sentry.captureException(error, { mechanism: { handled: false, type: 'auto.function.fastify' } })
    }
  })
}, {
  name: 'sentry',
  dependencies: ['env'],
})
