/** @import { FastifyPluginAsync } from 'fastify' */
/** @import { AppOptions } from '#config/options.js' */
import App from '../app.js'
import { createCliOptions } from '#config/server-options.js'

export const options = createCliOptions('worker')

/** @type {FastifyPluginAsync<Omit<AppOptions, 'role'>>} */
export default async function WorkerApp (fastify, opts) {
  return App(fastify, { ...opts, role: 'worker' })
}
