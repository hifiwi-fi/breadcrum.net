/**
 * @import { JSONSchema } from 'json-schema-to-ts'
 * @typedef {typeof schemaArchiveWithBookmark} SchemaArchiveWithBookmark
 */

export const schemaArchiveWithBookmark = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  $id: 'schema:breadcrum:archive-with-bookmark:read',
  allOf: [
    { $ref: 'schema:breadcrum:archive:read' },
    {
      type: 'object',
      properties: {
        bookmark: {
          $ref: 'schema:breadcrum:bookmark:read',
        },
      },
    },
  ],
})
export default schemaArchiveWithBookmark
