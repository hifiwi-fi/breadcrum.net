import fp from 'fastify-plugin'

import { schemaBookmarkBase } from './schema-bookmark-base.js'
import { schemaBookmarkCreate } from './schema-bookmark-create.js'
import { schemaBookmarkRead } from './schema-bookmark-read.js'

export default fp(async function schemaLoaderPlugin (fastify, _opts) {
  fastify.addSchema(schemaBookmarkBase)
  fastify.addSchema(schemaBookmarkCreate)
  fastify.addSchema(schemaBookmarkRead)
}, {
  name: 'bookmarks.schema',
  dependencies: [],
})
