import { getDefaultFeedDetails } from './get-default-feed-details.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@bret/type-provider-json-schema-to-ts'
 */

/**
 * admin/flags route returns frontend and backend flags and requires admin to see
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 * @returns {Promise<void>}
 */
export default async function defaultFeedDetailsRoutes (fastify, opts) {
  await Promise.all([
    getDefaultFeedDetails(fastify, opts),
  ])
}
