/**
 * @import { FastifyServerOptions, FastifyPluginOptions } from 'fastify'
 */

import hyperid from 'hyperid'
import { createLoggerOptions } from './logger-options.js'

/**
 * @typedef {Object} ServerOptionsConfig
 * @property {string} serviceName - The service name for logging (e.g., 'bc-web', 'bc-worker')
 * @property {boolean} [disableRequestLogging] - Whether to disable request logging (default: false)
 */

/**
 * @typedef {Partial<FastifyServerOptions> & Partial<FastifyPluginOptions>} ServerOptions
 */

/**
 * Create server options for Fastify with common configuration
 * @param {ServerOptionsConfig} config - Configuration options
 * @returns {ServerOptions}
 */
export function createServerOptions ({ serviceName, disableRequestLogging = false }) {
  const hid = hyperid()

  /** @type {ServerOptions} */
  const concreteOptions = {
    trustProxy: true,
    genReqId: function (/* req */) { return hid() },
    logger: createLoggerOptions({ serviceName }),
    ...(disableRequestLogging && { disableRequestLogging: true }),
  }

  return concreteOptions
}
