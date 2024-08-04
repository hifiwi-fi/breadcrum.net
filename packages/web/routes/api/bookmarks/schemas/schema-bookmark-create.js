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
    tags: {
      type: 'array',
      items: tagProps
    },
  },
})
