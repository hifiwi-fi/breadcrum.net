/**
 * @import { EnvSchemaType } from '../config/env-schema.js'
 * @import { AppOptions } from '../config/server-options.js'
 * @import { FastifyPluginAsync } from 'fastify'
 * @import { FastifyEnvOptions } from '@fastify/env'
 */
import fp from 'fastify-plugin'

/**
 * This plugins adds config
 *
 * @see https://github.com/fastify/fastify-env
 */
/** @type {FastifyPluginAsync<AppOptions>} */
async function envPlugin (fastify, opts) {
  /** @type {FastifyEnvOptions} */
  const envOptions = {
    schema: /** @type {EnvSchemaType} */ (fastify.getSchema('schema:dotenv')),
    dotenv: {
      path: opts.dotEnvPath,
      debug: false,
    }
  }

  if (opts.envData !== undefined) {
    envOptions.data = opts.envData
  }

  fastify.register(import('@fastify/env'), envOptions)
}

export default fp(envPlugin, {
  name: 'env',
})
