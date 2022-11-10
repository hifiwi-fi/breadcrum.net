import { confirmEmail } from './confirm-email.js'
import { postEmail } from './post-email.js'
import { verifyEmail } from './verify-email.js'

export default async function bookmarksRoutes (fastify, opts) {
  await Promise.all([
    confirmEmail(fastify, opts),
    postEmail(fastify, opts),
    verifyEmail(fastify, opts)
  ])
}
