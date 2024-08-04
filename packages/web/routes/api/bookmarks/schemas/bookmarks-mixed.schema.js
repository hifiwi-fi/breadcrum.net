import fp from 'fastify-plugin'

import { schemaBookmarkWithArchivesAndEpisodes } from './schema-bookmark-with-archives-and-episodes.js'

export default fp(async function schemaLoaderPlugin (fastify, _opts) {
  fastify.addSchema(schemaBookmarkWithArchivesAndEpisodes)
}, {
  name: 'bookmarks-mixed.schema',
  dependencies: [
    'bookmarks.schema',
    'episodes.schema',
    'archives.schema',
  ],
})
