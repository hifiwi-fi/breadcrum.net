import { getTags } from './get-tags.js'

export default async function tagsRoutes (fastify, opts) {
  await Promise.all([
    getTags(fastify, opts)
  ])
}
