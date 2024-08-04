import { getFeeds } from './get-feeds.js'
import { putFeeds } from './put-feeds.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 */

/**
 * admin/flags route returns frontend and backend flags and requires admin to see
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 * @returns {Promise<void>}
 */
export default async function feedsRoutes (fastify, opts) {
  await Promise.all([
    getFeeds(fastify, opts),
    putFeeds(fastify, opts),
  ])
}
