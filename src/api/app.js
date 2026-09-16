/** @import { FastifyPluginAsync } from 'fastify' */
/** @import { AppOptions } from '../runtime/options.js' */
import App from '../app.js'
export { options } from './config/server-options.js'

/** @type {FastifyPluginAsync<Omit<AppOptions, 'role'>>} */
export default async function ApiApp (fastify, opts) {
  return App(fastify, { ...opts, role: 'api' })
}
