import { getPasskey } from './get-passkey.js'
import { deletePasskey } from './delete-passkey.js'
import { updatePasskey } from './update-passkey.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 */

/**
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 * @returns {Promise<void>}
 */
export default async function passkeyIdRoutes (fastify, opts) {
  await Promise.all([
    getPasskey(fastify, opts),
    deletePasskey(fastify, opts),
    updatePasskey(fastify, opts),
  ])
}
