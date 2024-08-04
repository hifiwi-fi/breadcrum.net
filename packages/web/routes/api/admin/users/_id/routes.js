import { getAdminUser } from './get-admin-user.js'
import { putAdminUser } from './put-admin-user.js'
import { deleteAdminUser } from './delete-admin-user.js'

export default async function adminUserRoutes (fastify, opts) {
  await Promise.all([
    getAdminUser(fastify, opts),
    putAdminUser(fastify, opts),
    deleteAdminUser(fastify, opts),
  ])
}
