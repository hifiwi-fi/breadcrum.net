/**
 * @import { JSONSchema, FromSchema } from 'json-schema-to-ts'
 * @typedef {typeof schemaDeltaFeeds} SchemaDeltaFeeds
 * @typedef {FromSchema<SchemaDeltaFeeds>} TypeDeltaFeeds
 */

import { schemaFeedRead } from '../../feeds/schemas/schema-feed-read.js'

export const schemaDeltaFeeds = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  required: ['data', 'last_update'],
  additionalProperties: false,
  properties: {
    data: {
      type: 'array',
      items: schemaFeedRead,
    },
    last_update: {
      type: 'string',
      nullable: true,
      format: 'date-time',
    },
  },
})
