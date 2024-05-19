import AutoLoad from '@fastify/autoload'
import { join } from 'node:path'
import hyperid from 'hyperid'

const __dirname = import.meta.dirname
const hid = hyperid()

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

const PinoLevelToSeverityLookup = {
  trace: 'DEBUG',
  debug: 'DEBUG',
  info: 'INFO',
  warn: 'WARNING',
  error: 'ERROR',
  fatal: 'CRITICAL'
}

export const options = {
  trustProxy: true,
  genReqId: function (req) { return hid() },
  logger: {
    mixin () { // TODO: move this to the log ingestor somehow?
      return {
        service: 'bc-web'
      }
    },
    messageKey: 'message',
    formatters: {
      level (label, number) {
        return {
          level: PinoLevelToSeverityLookup[label] || PinoLevelToSeverityLookup.info,
          levelN: number
        }
      }
    }
  }
}
