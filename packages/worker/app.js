import AutoLoad from '@fastify/autoload'
import { join } from 'node:path'
import { envSchema } from './config/env-schema.js'

// Re-exporting the options object
export { options } from './config/server-options.js'

/**
 * @import { FastifyPluginAsync } from 'fastify'
 * @import { AppOptions } from './config/server-options.js'
 */

const __dirname = import.meta.dirname

/**
 * @type {FastifyPluginAsync<AppOptions>}
 */
export default async function App (fastify, opts) {
  const testPattern = /.*(test|spec)(\.js|\.cjs|\.mjs)$/i
  const skipPattern = /.*.no-load(\.js|\.cjs|\.mjs)$/i
  const ignorePattern = new RegExp(`${testPattern.source}|${skipPattern.source}`)

  // Load the env schema first thing
  fastify.addSchema(envSchema)

  // This loads all global plugins defined in the plugins folder
  // Plugins should use fp and be named and define their
  // plugin dependencies.
  fastify.register(AutoLoad, {
    dir: join(__dirname, 'plugins'),
    ignorePattern,
    dirNameRoutePrefix: false,
    options: { ...opts },
  })

  // This loads all of your routes in the routes folder and their
  // associated autoHooks (route scoped plugins).
  // Routes do not need to be wrapped in fp, but autoHooks do.
  fastify.register(AutoLoad, {
    dir: join(__dirname, 'routes'),
    indexPattern: /^.*routes(?:\.ts|\.js|\.cjs|\.mjs)$/,
    ignorePattern: /^.*(\.js|\.cjs|\.mjs)$/,
    autoHooksPattern: /.*hooks(\.js|\.cjs|\.mjs)$/i,
    autoHooks: true,
    cascadeHooks: true,
    overwriteHooks: true,
    routeParams: true,
    options: { ...opts },
  })
}
