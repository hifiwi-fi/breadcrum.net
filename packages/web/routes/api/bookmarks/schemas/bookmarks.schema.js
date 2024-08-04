import fp from 'fastify-plugin'

import { schemaBookmarkCreate } from './schema-bookmark-create.js'
import { schemaBookmarkRead } from './schema-bookmark-read.js'
import { schemaBookmarkUpdate } from './schema-bookmark-update.js'

export default fp(async function schemaLoaderPlugin (fastify, _opts) {
  fastify.addSchema(schemaBookmarkCreate)
  fastify.addSchema(schemaBookmarkRead)
  fastify.addSchema(schemaBookmarkUpdate)
}, {
  name: 'bookmarks.schema',
  dependencies: [],
})
