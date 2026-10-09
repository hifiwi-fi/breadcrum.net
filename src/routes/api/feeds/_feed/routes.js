import { getFeed } from './get-feed.js'
import { putFeed } from './put-feed.js'
import { deleteFeed } from './delete-feed.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 */

/**
 *
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 * @returns {Promise<void>}
 */
export default async function podcastFeedsRoutes (fastify, opts) {
  await Promise.all([
    getFeed(fastify, opts),
    putFeed(fastify, opts),
    deleteFeed(fastify, opts),
  ])
}
