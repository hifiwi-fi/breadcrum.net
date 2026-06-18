import fp from 'fastify-plugin'

export default fp(async function sentryPlugin (fastify) {
  if (!fastify.config.SENTRY_DSN) return

  const Sentry = await import('@sentry/node')
  Sentry.setupFastifyErrorHandler(fastify)
}, {
  name: 'sentry',
  dependencies: ['env'],
})
