import fp from 'fastify-plugin'

import { schemaArchiveBase } from './schema-archive-base.js'
import { schemaArchiveRead } from './schema-archive-read.js'

export default fp(async function schemaLoaderPlugin (fastify, _opts) {
  fastify.addSchema(schemaArchiveBase)
  fastify.addSchema(schemaArchiveRead)
}, {
  name: 'archives.schema',
  dependencies: [],
})
