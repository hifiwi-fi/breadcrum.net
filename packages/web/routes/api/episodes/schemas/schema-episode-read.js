import { episodeReadProps, episodeProps } from './episode-base.js'
import { schemaBookmarkJoin } from '../../bookmarks/schemas/schema-bookmark-join.js'
import { schemaFeedJoin } from '../../feeds/schemas/schema-feed-join.js'

/**
 * @import { JSONSchema, FromSchema } from 'json-schema-to-ts'
 * @typedef {typeof schemaEpisodeRead} SchemaEpisodeRead
 * @typedef {FromSchema<SchemaEpisodeRead, {
 *   deserialize: [{ pattern: { type: 'string'; format: 'date-time'; }; output: Date; }]
 * }>} TypeEpisodeRead
 * @typedef {FromSchema<SchemaEpisodeRead>} TypeEpisodeReadClient
 */

export const schemaEpisodeRead = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  $id: 'schema:breadcrum:episode:read',
  additionalProperties: false,
  required: ['bookmark', 'podcast_feed'],
  properties: {
    ...episodeReadProps.properties,
    ...episodeProps.properties,
    bookmark: schemaBookmarkJoin,
    podcast_feed: schemaFeedJoin
  }
})
