import { getSearchArchives } from './get-search-archives.js'

export default async function searchArchivesRoutes (fastify, opts) {
  await Promise.all([
    getSearchArchives(fastify, opts),
  ])
}
