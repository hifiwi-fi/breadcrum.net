import fp from 'fastify-plugin'

import { schemaEpisodeWithBookmarkAndFeed } from './schema-episode-with-bookmark-and-feed.js'

export default fp(async function schemaLoaderPlugin (fastify, _opts) {
  fastify.addSchema(schemaEpisodeWithBookmarkAndFeed)
}, {
  name: 'episodes-mixed.schema',
  dependencies: [
    'bookmarks.schema',
    'feeds.schema',
  ],
})
