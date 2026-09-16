/**
 * @import { FastifyServerOptions, FastifyPluginOptions } from 'fastify'
 * @import { RuntimeConfig } from '#runtime/env-schema.js'
 */

import hyperid from 'hyperid'
import { createLoggerOptions } from './logger-options.js'

/**
 * @typedef {Object} ServerOptionsConfig
 * @property {string} serviceName - The service name for logging (e.g., 'bc-web', 'bc-worker')
 * @property {boolean} [disableRequestLogging] - Whether to disable request logging (default: false)
 * @property {string | undefined} [role] - Runtime role for log context
 * @property {RuntimeConfig['FASTIFY_LOG_LEVEL'] | undefined} [logLevel] - Minimum Pino log level
 */

/**
 * @typedef {Partial<FastifyServerOptions> & Partial<FastifyPluginOptions>} ServerOptions
 */

/**
 * Create server options for Fastify with common configuration
 * @param {ServerOptionsConfig} config - Configuration options
 * @returns {ServerOptions}
 */
export function createServerOptions ({ serviceName, disableRequestLogging = false, role, logLevel }) {
  const hid = hyperid()

  /** @type {ServerOptions} */
  const concreteOptions = {
    trustProxy: true,
    pluginTimeout: 40_000, // Must exceed any per-plugin timeouts (e.g. geoip update timeout in plugins/geoip.js)
    genReqId: function (/* req */) { return hid() },
    logger: createLoggerOptions({ serviceName, role, level: logLevel }),
    ...(disableRequestLogging && { disableRequestLogging: true }),
  }

  return concreteOptions
}
