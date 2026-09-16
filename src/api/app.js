/** @import { FastifyPluginAsync } from 'fastify' */
/** @import { AppOptions } from '#config/options.js' */
import App from '../app.js'
import { createCliOptions } from '#config/server-options.js'

export const options = createCliOptions('api')

/** @type {FastifyPluginAsync<Omit<AppOptions, 'role'>>} */
export default async function ApiApp (fastify, opts) {
  return App(fastify, { ...opts, role: 'api' })
}
