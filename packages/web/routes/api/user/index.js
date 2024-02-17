import { getUser } from './get-user.js'
import { putUser } from './put-user.js'

export default async function userRoutes (fastify, opts) {
  await Promise.all([
    getUser(fastify, opts),
    putUser(fastify, opts)
  ])
}
