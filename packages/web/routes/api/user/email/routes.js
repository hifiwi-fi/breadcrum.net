import { resendEmailVerificationRoute } from './resend-confirmation.js'
import { postEmailRoute } from './post-email.js'
import { verifyEmailRoute } from './verify-email.js'
import { deleteEmailRoute } from './delete-email.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@bret/type-provider-json-schema-to-ts'
 */

/**
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 * @returns {Promise<void>}
 */
export default async function bookmarksRoutes (fastify, opts) {
  await Promise.all([
    resendEmailVerificationRoute(fastify, opts),
    postEmailRoute(fastify, opts),
    verifyEmailRoute(fastify, opts),
    deleteEmailRoute(fastify, opts),
  ])
}
