import AutoLoad from '@fastify/autoload'
import { join } from 'path'
import desm from 'desm'
import hyperid from 'hyperid'

const __dirname = desm(import.meta.url)
const hid = hyperid()

export default async function App (fastify, opts) {
  // Place here your custom code!

  // Do not touch the following lines

  // This loads all plugins defined in plugins
  // those should be support plugins that are reused
  // through your application
  fastify.register(AutoLoad, {
    dir: join(__dirname, 'plugins'),
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
    options: Object.assign({}, opts)
  })

  // await fastify.after()
  // console.log(fastify.printRoutes())
}

export const options = {
  // TODO: get this out of env from fly
  trustProxy: true,
  genReqId: function (req) { return hid() }
}
