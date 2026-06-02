/**
 * @import { JSONSchema, FromSchema } from 'json-schema-to-ts'
 * @typedef {typeof schemaDeltaLastUpdate} SchemaDeltaLastUpdate
 * @typedef {FromSchema<SchemaDeltaLastUpdate>} TypeDeltaLastUpdate
 */

export const schemaDeltaLastUpdate = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  required: ['bookmarks', 'feeds'],
  additionalProperties: false,
  properties: {
    bookmarks: {
      type: 'string',
      nullable: true,
      format: 'date-time',
    },
    feeds: {
      type: 'string',
      nullable: true,
      format: 'date-time',
    },
  },
})
