import { getDefaultFeedDetails } from './get-default-feed-details.js'

export default async function defaultFeedDetailsRoutes (fastify, opts) {
  await Promise.all([
    getDefaultFeedDetails(fastify, opts),
  ])
}
