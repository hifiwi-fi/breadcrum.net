/**
 * @import { EnvSchemaType } from '../config/env-schema.js'
 * @import { AppOptions } from '../config/server-options.js'
 * @import { FastifyPluginAsync } from 'fastify'
 * @import { FastifyEnvOptions } from '@fastify/env'
 */
import fp from 'fastify-plugin'
import { readFile } from 'fs/promises'
import { join } from 'path'

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
      quiet: true,
    }
  }

  if (opts.envData !== undefined) {
    envOptions.data = opts.envData
  }

  fastify.register(import('@fastify/env'), envOptions)

  const __dirname = import.meta.dirname
  const pkg = JSON.parse(await readFile(join(__dirname, '../package.json'), 'utf8'))

  fastify.decorate('pkg', pkg)
}

export default fp(envPlugin, {
  name: 'env',
})
