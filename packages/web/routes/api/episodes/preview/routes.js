import { getPreview } from './get-preview.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@bret/type-provider-json-schema-to-ts'
 */

/**
 *
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 * @returns {Promise<void>}
 */
export default async function previewRoutes (fastify, opts) {
  await Promise.all([
    getPreview(fastify, opts),
  ])
}
