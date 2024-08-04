import { getPreview } from './get-preview.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@bret/type-provider-json-schema-to-ts'
 */

/**
 * admin/flags route returns frontend and backend flags and requires admin to see
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 * @returns {Promise<void>}
 */
export default async function previewRoutes (fastify, opts) {
  await Promise.all([
    getPreview(fastify, opts),
  ])
}
