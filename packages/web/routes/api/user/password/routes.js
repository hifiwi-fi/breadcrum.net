import { postPasswordRoute } from './post-password.js'
import { resetPasswordRoute } from './reset-password.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@bret/type-provider-json-schema-to-ts'
 */

/**
 *
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 * @returns {Promise<void>}
 */
export default async function bookmarksRoutes (fastify, opts) {
  await Promise.all([
    postPasswordRoute(fastify, opts),
    resetPasswordRoute(fastify, opts),
  ])
}
