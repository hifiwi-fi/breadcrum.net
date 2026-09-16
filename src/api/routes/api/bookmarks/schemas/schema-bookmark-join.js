import { bookmarkReadProps, bookmarkProps } from './bookmark-base.js'

/**
 * @import { JSONSchema, FromSchema } from 'json-schema-to-ts'
 * @typedef {typeof schemaBookmarkJoin} SchemaBookmarkJoin
 * @typedef {FromSchema<SchemaBookmarkJoin, {
 *   deserialize: [{ pattern: { type: 'string'; format: 'date-time'; }; output: Date; }]
 * }>} TypeBookmarkJoin
 */

export const schemaBookmarkJoin = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  // required: bookmarkReadProps.required,
  additionalProperties: false,
  properties: {
    ...bookmarkReadProps.properties,
    ...bookmarkProps.properties,
  },
})
