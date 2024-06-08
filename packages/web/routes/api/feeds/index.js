import { getFeeds } from './get-feeds.js'
import { putFeeds } from './put-feeds.js'

export default async function feedsRoutes (fastify, opts) {
  await Promise.all([
    getFeeds(fastify, opts),
    putFeeds(fastify, opts),
  ])
}
