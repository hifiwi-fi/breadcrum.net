import fp from 'fastify-plugin'

import { schemaArchiveRead } from './schema-archive-read.js'
import { schemaArchiveUpdate } from './schema-archive-update.js'

export default fp(async function schemaLoaderPlugin (fastify, _opts) {
  fastify.addSchema(schemaArchiveRead)
  fastify.addSchema(schemaArchiveUpdate)
}, {
  name: 'archives.schema',
  dependencies: [],
})
