/**
 * @import { JSONSchema } from 'json-schema-to-ts'
 * @typedef {typeof schemaBookmarkRead} SchemaBookmarkRead
 */

export const schemaBookmarkRead = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  $id: 'schema:breadcrum:bookmark:read',
  allOf: [
    { $ref: 'schema:breadcrum:bookmark:base' },
    {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' },
      },
    },
  ],
})
export default schemaBookmarkRead
