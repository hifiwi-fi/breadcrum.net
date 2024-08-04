import fp from 'fastify-plugin'

import { schemaArchiveBase } from './schema-archive-base.js'
import { schemaArchiveCreate } from './schema-archive-create.js'
import { schemaArchiveRead } from './schema-archive-read.js'

export default fp(async function schemaLoaderPlugin (fastify, _opts) {
  fastify.addSchema(schemaArchiveBase)
  fastify.addSchema(schemaArchiveCreate)
  fastify.addSchema(schemaArchiveRead)
}, {
  name: 'archives.schema',
  dependencies: [],
})
