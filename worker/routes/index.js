/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 */

/**
 *
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 * @returns {Promise<void>}
 */
export default async function rootRoute (fastify, _opts) {
  fastify.get(
    '/',
    {},
    async function (_request, _reply) {
      return {
        hello: 'world',
        name: 'bc-worker',
        version: fastify.pkg.version,
      }
    }
  )
}
