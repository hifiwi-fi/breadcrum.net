import fp from 'fastify-plugin'

import { schemaArchiveWithBookmark } from './schema-archive-with-bookmark.js'

export default fp(async function schemaLoaderPlugin (fastify, _opts) {
  fastify.addSchema(schemaArchiveWithBookmark)
}, {
  name: 'archives-mixed.schema',
  dependencies: [
    'bookmarks.schema',
    'archives.schema',
  ],
})
