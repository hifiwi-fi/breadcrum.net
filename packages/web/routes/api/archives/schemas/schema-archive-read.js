/**
 * @import { JSONSchema } from 'json-schema-to-ts'
 * @typedef {typeof schemaArchiveRead} SchemaArchiveRead
 */

export const schemaArchiveRead = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  $id: 'schema:breadcrum:archive:read',
  allOf: [
    { $ref: 'schema:breadcrum:archive:base' },
    {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' },
        extraction_method: { enum: ['server', 'client'] },
        display_title: { type: 'string' },
      },
    },
  ],
})
export default schemaArchiveRead
