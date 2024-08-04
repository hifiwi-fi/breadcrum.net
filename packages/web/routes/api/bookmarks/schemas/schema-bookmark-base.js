/**
 * @import { JSONSchema, FromSchema } from 'json-schema-to-ts'
 * @typedef {typeof schemaBookmarkBase} SchemaBookmarkBase
 * @typedef {FromSchema<SchemaBookmarkBase>} TypeBookmarkBase
 */

export const schemaBookmarkBase = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  $id: 'schema:breadcrum:bookmark:base',
  properties: {
    url: { type: 'string', format: 'uri' },
    title: { type: 'string', minLength: 1, maxLength: 255 },
    note: { type: 'string' },
    starred: { type: 'boolean' },
    toread: { type: 'boolean' },
    sensitive: { type: 'boolean' },
    tags: {
      type: 'array',
      items: {
        type: 'string',
        minLength: 1,
        maxLength: 255,
      },
    },
    archive_urls: {
      type: 'array',
      items: {
        type: 'string',
        format: 'uri',
      },
    },
    summary: { type: 'string' }, // for client side extracted descriptions as fallbacks
  },
})

export default schemaBookmarkBase
