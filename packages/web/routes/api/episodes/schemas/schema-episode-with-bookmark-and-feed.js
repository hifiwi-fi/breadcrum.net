/**
 * @import { JSONSchema } from 'json-schema-to-ts'
 * @typedef {typeof schemaEpisodeWithBookmarkAndFeed} SchemaEpisodeWithBookmarkAndFeed
 */

export const schemaEpisodeWithBookmarkAndFeed = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  $id: 'schema:breadcrum:episode-with-bookmark-and-feed',
  allOf: [
    { $ref: 'schema:breadcrum:episode:read' },
    {
      type: 'object',
      properties: {
        bookmark: {
          $ref: 'schema:breadcrum:bookmark:read',
        },
        podcast_feed: {
          $ref: 'schema:breadcrum:feed:read',
        },
      },
    },
  ],
})

export default schemaEpisodeWithBookmarkAndFeed
