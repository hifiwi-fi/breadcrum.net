import { postPassword } from './post-password.js'
import { resetPassword } from './reset-password.js'

export default async function bookmarksRoutes (fastify, opts) {
  await Promise.all([
    postPassword(fastify, opts),
    resetPassword(fastify, opts)
  ])
}
