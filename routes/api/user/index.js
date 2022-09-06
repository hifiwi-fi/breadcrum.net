import { getUser } from './get-user.js'

export default async function userRoutes (fastify, opts) {
  await Promise.all([
    getUser(fastify, opts)
  ])
}
