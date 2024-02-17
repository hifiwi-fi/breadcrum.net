import { getEpisode } from './get-episode.js'
import { putEpisode } from './put-episode.js'
import { deleteEpisode } from './delete-episode.js'

export default async function episodeRoutes (fastify, opts) {
  await Promise.all([
    getEpisode(fastify, opts),
    putEpisode(fastify, opts),
    deleteEpisode(fastify, opts)
  ])
}
