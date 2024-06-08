import { getArchive } from './get-archive.js'
import { putArchive } from './put-archive.js'
import { deleteArchive } from './delete-archive.js'

export default async function episodeRoutes (fastify, opts) {
  await Promise.all([
    getArchive(fastify, opts),
    putArchive(fastify, opts),
    deleteArchive(fastify, opts),
  ])
}
