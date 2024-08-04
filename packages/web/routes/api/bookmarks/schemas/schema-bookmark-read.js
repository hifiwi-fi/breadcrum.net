import { schemaBookmarkBase } from './schema-bookmark-base.js'

/**
 * @import { JSONSchema, FromSchema } from 'json-schema-to-ts'
 * @typedef {typeof schemaBookmarkRead} SchemaBookmarkRead
 * @typedef {FromSchema<SchemaBookmarkRead>} TypeBookmarkRead
 */

export const schemaBookmarkRead = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  $id: 'schema:breadcrum:bookmark:read',
  required: ['id', 'created_at', 'updated_at', 'url'],
  properties: {
    id: { type: 'string', format: 'uuid' },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' },
    ...schemaBookmarkBase.properties
  },
})

export default schemaBookmarkRead
