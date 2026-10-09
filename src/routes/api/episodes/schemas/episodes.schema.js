import fp from 'fastify-plugin'

import { schemaEpisodeRead } from './schema-episode-read.js'
import { schemaEpisodeUpdate } from './schema-episode-update.js'

export default fp(async function schemaLoaderPlugin (fastify, _opts) {
  fastify.addSchema(schemaEpisodeRead)
  fastify.addSchema(schemaEpisodeUpdate)
}, {
  name: 'episodes.schema',
  dependencies: [],
})
