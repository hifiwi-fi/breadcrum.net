import { bookmarkProps } from './bookmark-base.js'
import { tagProps } from '../../tags/schemas/tags-base.js'

/**
 * @import { JSONSchema, FromSchema } from 'json-schema-to-ts'
 * @typedef {typeof schemaBookmarkCreate} SchemaBookmarkCreate
 * @typedef {FromSchema<SchemaBookmarkCreate>} TypeBookmarkCreate
 */

export const schemaBookmarkCreate = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  $id: 'schema:breadcrum:bookmark:create',
  additionalProperties: false,
  required: ['url'],
  properties: {
    ...bookmarkProps.properties,
    // Override minimum length on create
    title: { type: 'string', minLength: 0, maxLength: 255 },
    tags: {
      type: 'array',
      items: tagProps
    },
  },
})
