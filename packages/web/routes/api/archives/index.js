import { getArchives } from './get-archives.js'
import { putArchives } from './put-archives.js'

export default async function archiveRoutes (fastify, opts) {
  await Promise.all([
    getArchives(fastify, opts),
    putArchives(fastify, opts),
  ])
}
