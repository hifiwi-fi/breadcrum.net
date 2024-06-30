import { resendEmailVerification } from './resend-confirmation.js'
import { postEmail } from './post-email.js'
import { verifyEmail } from './verify-email.js'
import { deleteEmail } from './delete-email.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 */

/**
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 * @returns {Promise<void>}
 */
export default async function bookmarksRoutes (fastify, opts) {
  await Promise.all([
    resendEmailVerification(fastify, opts),
    verifyEmail(fastify, opts),
    postEmail(fastify, opts),
    deleteEmail(fastify, opts),
  ])
}
