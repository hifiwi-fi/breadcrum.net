import { getFlags } from './get-flags.js'

export default async function bookmarksRoutes (fastify, opts) {
  await Promise.all([
    getFlags(fastify, opts)
  ])
}
