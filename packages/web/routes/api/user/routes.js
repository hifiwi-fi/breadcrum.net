import { getUser } from './get-user.js'
import { putUser } from './put-user.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 */

/**
 * admin/flags route returns frontend and backend flags and requires admin to see
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 * @returns {Promise<void>}
 */
export default async function userRoutes (fastify, opts) {
  await Promise.all([
    getUser(fastify, opts),
    putUser(fastify, opts),
  ])
}
