import { getFeeds } from './get-feeds.js'
import { putFeeds } from './put-feeds.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@bret/type-provider-json-schema-to-ts'
 */

/**
 *
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 * @returns {Promise<void>}
 */
export default async function feedsRoutes (fastify, opts) {
  await Promise.all([
    getFeeds(fastify, opts),
    putFeeds(fastify, opts),
  ])
}
