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
  const testPattern = /.*(test|spec).js/
  // This loads all plugins defined in plugins
  // those should be support plugins that are reused
  // through your application
  fastify.register(AutoLoad, {
    dir: join(__dirname, 'plugins'),
    dirNameRoutePrefix: false,
    ignorePattern: testPattern,
    options: Object.assign({}, opts)
  })

  // This loads all plugins defined in routes
  // define your routes in one of these
  fastify.register(AutoLoad, {
    dir: join(__dirname, 'routes'),
    routeParams: true,
    autoHooks: true,
    cascadeHooks: true,
    overwriteHooks: true,
    ignorePattern: testPattern,
    options: Object.assign({}, opts)
  })
}

const PinoLevelToSeverityLookup = /** @type {const} */ ({
  trace: 'DEBUG',
  debug: 'DEBUG',
  info: 'INFO',
  warn: 'WARNING',
  error: 'ERROR',
  fatal: 'CRITICAL'
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
        service: 'bc-web'
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
          levelN: number
        }
      }
    }
  }
}
