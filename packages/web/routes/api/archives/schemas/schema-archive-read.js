import { archiveProps, archiveReadProps } from './archive-base.js'
import { schemaBookmarkJoin } from '../../bookmarks/schemas/schema-bookmark-join.js'

/**
 * @import { JSONSchema, FromSchema } from 'json-schema-to-ts'
 * @typedef {typeof schemaArchiveRead} SchemaArchiveRead
 * @typedef {FromSchema<SchemaArchiveRead, {
 *   deserialize: [{ pattern: { type: 'string'; format: 'date-time'; }; output: Date; }]
 * }>} TypeArchiveRead
 * @typedef {FromSchema<SchemaArchiveRead>} TypeArchiveReadClient
 */

export const schemaArchiveRead = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  $id: 'schema:breadcrum:archive:read',
  additionalProperties: false,
  required: ['created_at', 'url', 'extraction_method', 'bookmark'],
  properties: {
    ...archiveReadProps.properties,
    ...archiveProps.properties,
    bookmark: schemaBookmarkJoin
  },
})
