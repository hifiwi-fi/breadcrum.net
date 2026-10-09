import { registrationChallenge } from './post-challenge.js'
import { registrationVerify } from './post-verify.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 */

/**
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 * @returns {Promise<void>}
 */
export default async function registerRoutes (fastify, opts) {
  await Promise.all([
    registrationChallenge(fastify, opts),
    registrationVerify(fastify, opts),
  ])
}
