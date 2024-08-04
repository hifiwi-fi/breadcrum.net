/**
 * @import { JSONSchema } from 'json-schema-to-ts'
 * @typedef {typeof schemaBookmarkWithArchivesAndEpisodes} SchemaBookmarkWithArchivesAndEpisodes
 */

export const schemaBookmarkWithArchivesAndEpisodes = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  $id: 'schema:breadcrum:bookmark-with-archives-and-episode',
  allOf: [
    { $ref: 'schema:breadcrum:bookmark:read' },
    {
      type: 'object',
      properties: {
        episodes: {
          type: 'array',
          items: {
            $ref: 'schema:breadcrum:episode:read',
          },
        },
        archives: {
          type: 'array',
          items: {
            $ref: 'schema:breadcrum:archive:read',
          },
        },
      },
    },
  ],
})

export default schemaBookmarkWithArchivesAndEpisodes
