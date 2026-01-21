import { getAuthenticationChallenge } from './get-challenge.js'
import { authenticationVerify } from './post-verify.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 */

/**
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 * @returns {Promise<void>}
 */
export default async function authenticateRoutes (fastify, opts) {
  await Promise.all([
    getAuthenticationChallenge(fastify, opts),
    authenticationVerify(fastify, opts),
  ])
}
