/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 */

/**
 * admin/flags route returns frontend and backend flags and requires admin to see
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 * @returns {Promise<void>}
 */
export default async function defaultFeedRoutes (_fastify, _opts) {
  // placeholder
  // TODO: maybe parity the get put feed where it makes sense
  // (or throw an error where it doesn't)
}
