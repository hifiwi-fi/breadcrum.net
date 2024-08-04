import { bookmarkReadProps, bookmarkProps } from './bookmark-base.js'
import { tagProps } from '../../tags/schemas/tags-base.js'
import { schemaEpisodeJoin } from '../../episodes/schemas/schema-episode-join.js'
import { schemaArchiveJoin } from '../../archives/schemas/schema-archive-join.js'

/**
 * @import { JSONSchema, FromSchema } from 'json-schema-to-ts'
 * @typedef {typeof schemaBookmarkRead} SchemaBookmarkRead
 * @typedef {FromSchema<SchemaBookmarkRead, {
 *   deserialize: [{ pattern: { type: 'string'; format: 'date-time'; }; output: Date; }]
 * }>} TypeBookmarkRead
 */

export const schemaBookmarkRead = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  $id: 'schema:breadcrum:bookmark:read',
  required: [
    ...bookmarkReadProps.required,
    'tags',
    'archives',
    'episodes'
  ],
  additionalProperties: false,
  properties: {
    ...bookmarkReadProps.properties,
    ...bookmarkProps.properties,
    tags: {
      type: 'array',
      items: tagProps
    },
    archives: {
      type: 'array',
      items: schemaArchiveJoin
    },
    episodes: {
      type: 'array',
      items: schemaEpisodeJoin
    }
  },
})
