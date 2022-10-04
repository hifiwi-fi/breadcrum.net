import { getAdminFlags } from './get-admin-flags.js'
import { putAdminFlags } from './put-admin-flags.js'

export default async function bookmarksRoutes (fastify, opts) {
  await Promise.all([
    getAdminFlags(fastify, opts),
    putAdminFlags(fastify, opts)
  ])
}
