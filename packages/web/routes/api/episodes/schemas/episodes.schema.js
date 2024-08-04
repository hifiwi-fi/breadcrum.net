import fp from 'fastify-plugin'

import { schemaEpisodeBase } from './schema-episode-base.js'
import { schemaEpisodeRead } from './schema-episode-read.js'

export default fp(async function schemaLoaderPlugin (fastify, _opts) {
  fastify.addSchema(schemaEpisodeBase)
  fastify.addSchema(schemaEpisodeRead)
}, {
  name: 'episodes.schema',
  dependencies: [],
})
