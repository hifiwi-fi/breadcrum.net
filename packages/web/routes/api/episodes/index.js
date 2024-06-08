import { getEpisodes } from './get-episodes.js'
import { putEpisodes } from './put-episodes.js'

export default async function episodesRoutes (fastify, opts) {
  await Promise.all([
    getEpisodes(fastify, opts),
    putEpisodes(fastify, opts),
  ])
}
