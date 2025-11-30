/**
 * @import { DotEnvSchemaType } from '../config/env-schema.js'
 * @import { ServerOptions } from '@breadcrum/resources/fastify-common/server-options.js'
 */
import { resolve } from 'path'
import { createServerOptions } from '@breadcrum/resources/fastify-common/server-options.js'

const fastifyOptions = createServerOptions({
  serviceName: 'bc-web',
})

const applicationOptions = /** @type {const} */ ({
  dotEnvPath: resolve(import.meta.dirname, '../.env'),
})

/**
 * @typedef {ServerOptions &
 *  typeof applicationOptions &
 *  Partial<{
 *    envData: Partial<DotEnvSchemaType>
 *  }>
 * } AppOptions
 */

export const options = /** @type {AppOptions} */ ({
  ...fastifyOptions,
  ...applicationOptions,
})
