/**
 * @import { FastifyServerOptions } from 'fastify'
 * @import { RuntimeConfig } from './env-schema.js'
 */
import { loadRuntimeConfig } from './config.js'
import { createServerOptions } from '#resources/fastify-common/server-options.js'
import { createLoggerOptions } from '#resources/fastify-common/logger-options.js'

// CLI reads these getters when starting, not when tests import the application.
/** @type {FastifyServerOptions & { config: RuntimeConfig }} */
export const options = {
  ...createServerOptions({ serviceName: 'breadcrum' }),
  get config () {
    return loadRuntimeConfig()
  },
  get logger () {
    const config = loadRuntimeConfig()
    return createLoggerOptions({
      serviceName: config.OTEL_SERVICE_NAME,
      role: config.APP_ROLE,
      level: config.FASTIFY_LOG_LEVEL,
    })
  },
  get disableRequestLogging () {
    return loadRuntimeConfig().APP_ROLE === 'worker'
  },
}
