/**
 * @import { FastifyServerOptions, FastifyPluginOptions } from 'fastify'
 * @import { DotEnvSchemaType } from '../config/env-schema.js'
 */
import { resolve } from 'path'
import hyperid from 'hyperid'
import { loggerOptions } from './logger-options.js'

const hid = hyperid()

const fastifyOptions = /** @type{const} @satisfies {Partial<FastifyServerOptions>} */ ({
  trustProxy: true,
  genReqId: function (/* req */) { return hid() },
  logger: loggerOptions,
})

const applicationOptions = /** @type {const} */ ({
  dotEnvPath: resolve(import.meta.dirname, '../.env')
})

/**
 * @typedef {Partial<FastifyServerOptions> &
 *  Partial<FastifyPluginOptions> &
 *  typeof applicationOptions &
 *  Partial<{
 *    envData: Partial<DotEnvSchemaType>
 *  }>
 * } AppOptions
 */

export const options = /** @type{const} @satisfies {AppOptions} */({
  ...fastifyOptions,
  ...applicationOptions
})
