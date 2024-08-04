import AutoLoad from '@fastify/autoload'
import { join } from 'node:path'
import hyperid from 'hyperid'

/**
 * @import { FastifyPluginAsync, FastifyServerOptions } from 'fastify'
 * @import { AutoloadPluginOptions } from '@fastify/autoload'
 */

const __dirname = import.meta.dirname
const hid = hyperid()

/**
 * @type {FastifyPluginAsync<AppOptions>}
 */
export default async function App (fastify, opts) {
  const testPattern = /.*(test|spec)(\.js|\.cjs|\.mjs)$/i
  const skipPattern = /.*.no-load(\.js|\.cjs|\.mjs)$/i
  const ignorePattern = new RegExp(`${testPattern.source}|${skipPattern.source}`)

  // Load any files in the routes folder ending with .schema.js
  // Use these files to register schemas in the fastify schema store.
  // Use fp to ensure load order correctness.
  fastify.register(AutoLoad, {
    dir: join(__dirname, 'routes'),
    matchFilter: /^.*[a-zA-Z0-9_-]+\.schema(\.js|\.cjs|\.mjs)$/i,
    indexPattern: /(?!.*)/,
    dirNameRoutePrefix: false,
    autoHooks: false,
    options: { ...opts },
  })

  // This loads all plugins defined in plugins
  // those should be support plugins that are reused
  // through your application
  fastify.register(AutoLoad, {
    dir: join(__dirname, 'plugins'),
    ignorePattern,
    dirNameRoutePrefix: false,
    options: { ...opts },
  })

  // This loads all plugins defined in routes
  // define your routes in one of these
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

const PinoLevelToSeverityLookup = /** @type {const} */ ({
  trace: 'DEBUG',
  debug: 'DEBUG',
  info: 'INFO',
  warn: 'WARNING',
  error: 'ERROR',
  fatal: 'CRITICAL',
})

/**
 * @typedef { {} &
 *   Partial<FastifyServerOptions> &
 *   Partial<AutoloadPluginOptions>
 * } AppOptions
 */

/**
 * @type {AppOptions}
 */
export const options = {
  trustProxy: true,
  genReqId: function (/* req */) { return hid() },
  logger: {
    mixin () {
      return {
        service: 'bc-web',
      }
    },
    messageKey: 'message',
    formatters: {
      level (label, number) {
        return {
          level: PinoLevelToSeverityLookup[
            /** @type {keyof typeof PinoLevelToSeverityLookup} */
            (label)
          ] || PinoLevelToSeverityLookup.info,
          levelN: number,
        }
      },
    },
  },
}
