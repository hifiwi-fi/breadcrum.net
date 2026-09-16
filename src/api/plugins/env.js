/** @import { FastifyPluginAsync } from 'fastify' */
/** @import { AppOptions } from '#config/options.js' */
import fp from 'fastify-plugin'
import { loadConfig } from '#config/config.js'

/** @type {FastifyPluginAsync<AppOptions>} */
async function envPlugin (fastify, opts) {
  fastify.decorate('config', opts.config ?? loadConfig(opts.role, opts))
}

export default fp(envPlugin, { name: 'env' })
