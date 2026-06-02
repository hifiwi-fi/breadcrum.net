/**
 * @import { JSONSchema, FromSchema } from 'json-schema-to-ts'
 * @typedef {typeof schemaDeltaBookmarks} SchemaDeltaBookmarks
 * @typedef {FromSchema<SchemaDeltaBookmarks>} TypeDeltaBookmarks
 */

import { schemaBookmarkRead } from '../../bookmarks/schemas/schema-bookmark-read.js'

export const schemaDeltaBookmarks = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  required: ['data', 'last_update'],
  additionalProperties: false,
  properties: {
    data: {
      type: 'array',
      items: schemaBookmarkRead,
    },
    last_update: {
      type: 'string',
      nullable: true,
      format: 'date-time',
    },
  },
})
