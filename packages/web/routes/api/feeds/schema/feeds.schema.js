import fp from 'fastify-plugin'

import { schemaFeedBase } from './schema-feed-base.js'
import { schemaFeedRead } from './schema-feed-read.js'

export default fp(async function schemaLoaderPlugin (fastify, _opts) {
  fastify.addSchema(schemaFeedBase)
  fastify.addSchema(schemaFeedRead)
}, {
  name: 'feeds.schema',
  dependencies: [],
})
