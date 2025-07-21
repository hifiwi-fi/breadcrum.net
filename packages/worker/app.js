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

const PinoLevelToSeverityLookup = {
  trace: 'DEBUG',
  debug: 'DEBUG',
  info: 'INFO',
  warn: 'WARNING',
  error: 'ERROR',
  fatal: 'CRITICAL',
}

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
  disableRequestLogging: true,
  logger: {
    mixin () {
      return {
        service: 'bc-worker',
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
