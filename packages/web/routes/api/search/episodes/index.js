import { getSearchEpisodes } from './get-search-episodes.js'

export default async function searchEpisodesRoutes (fastify, opts) {
  await Promise.all([
    getSearchEpisodes(fastify, opts),
  ])
}
