import { resendEmailVerification } from './resend-confirmation.js'
import { postEmail } from './post-email.js'
import { verifyEmail } from './verify-email.js'
import { deleteEmail } from './delete-email.js'
import { unsubscribeEmail } from './unsubscribe.js'

export default async function bookmarksRoutes (fastify, opts) {
  await Promise.all([
    resendEmailVerification(fastify, opts),
    verifyEmail(fastify, opts),
    postEmail(fastify, opts),
    deleteEmail(fastify, opts),
    unsubscribeEmail(fastify, opts)
  ])
}
