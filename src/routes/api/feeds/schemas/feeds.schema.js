import fp from 'fastify-plugin'

import { schemaFeedRead } from './schema-feed-read.js'

export default fp(async function schemaLoaderPlugin (fastify, _opts) {
  fastify.addSchema(schemaFeedRead)
}, {
  name: 'feeds.schema',
  dependencies: [],
})
