/**
 * @import { FastifyServerOptions } from 'fastify'
 * @import { RuntimeConfig } from './env-schema.js'
 */
import { loadRuntimeConfig } from './config.js'
import { createServerOptions } from './fastify-options.js'
import { RequestLogController } from './request-log-controller.js'
import { createLoggerOptions } from './logger-options.js'

// CLI reads these getters when starting, not when tests import the application.
// Cache one validated snapshot for all server options; runtime plugins use Fastify's decorated config.
// The telemetry preload and CLI config run before Fastify exists and load config independently.
let runtimeConfig

function getRuntimeConfig () {
  runtimeConfig ??= loadRuntimeConfig()
  return runtimeConfig
}

/** @type {FastifyServerOptions & { config: RuntimeConfig }} */
export const options = {
  ...createServerOptions({ serviceName: 'breadcrum' }),
  get config () {
    return getRuntimeConfig()
  },
  get logger () {
    const config = getRuntimeConfig()
    return createLoggerOptions({
      serviceName: config.OTEL_SERVICE_NAME,
      role: config.APP_ROLE,
      level: config.FASTIFY_LOG_LEVEL,
    })
  },
  get logController () {
    return new RequestLogController({
      disableRequestLogging: getRuntimeConfig().APP_ROLE === 'worker',
    })
  },
}
