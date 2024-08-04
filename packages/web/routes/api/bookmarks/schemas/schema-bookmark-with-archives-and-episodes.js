/**
 * @import { JSONSchema, FromSchema } from 'json-schema-to-ts'
 * @import { SchemaBookmarkRead } from './schema-bookmark-read.js'
 * @import { SchemaEpisodeRead } from '../../episodes/schemas/schema-episode-read.js'
 * @import { SchemaArchiveRead } from '../../archives/schemas/schema-archive-read.js'
 * @typedef {typeof schemaBookmarkWithArchivesAndEpisodes} SchemaBookmarkWithArchivesAndEpisodes
 * @typedef {FromSchema<SchemaBookmarkWithArchivesAndEpisodes, {
 *  references: [
 *    SchemaBookmarkRead,
 *    SchemaEpisodeRead,
 *    SchemaArchiveRead
 * ],
*  deserialize: [{
*   pattern: {
*     type: "string";
*      format: "date-time";
*    }
*    output: Date;
* }]
 * }>} TypeBookmarkWithArchivesAndEpisodes
 *
*/

export const schemaBookmarkWithArchivesAndEpisodes = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  unevaluatedProperties: false,
  $id: 'schema:breadcrum:bookmark-with-archives-and-episode',
  allOf: [
    { $ref: 'schema:breadcrum:bookmark:read' },
    {
      type: 'object',
      properties: {
        archives: {
          type: 'array',
          items: { $ref: 'schema:breadcrum:archive:read' },
        },
        episodes: {
          type: 'array',
          items: { $ref: 'schema:breadcrum:episode:read' },
        },
      }
    }
  ],
})
