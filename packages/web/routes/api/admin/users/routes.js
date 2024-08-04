import { getAdminUsers } from './get-admin-users.js'

export default async function adminUsersRoutes (fastify, opts) {
  await Promise.all([
    getAdminUsers(fastify, opts),
  ])
}
