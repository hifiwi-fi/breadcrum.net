/**
 * @import { JSONSchema } from 'json-schema-to-ts'
 * @typedef {typeof schemaBookmarkCreate} SchemaBookmarkCreate
 */

export const schemaBookmarkCreate = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  $id: 'schema:breadcrum:bookmark:create',
  properties: {
    createBookmark: {
      anyOf: [
        {
          type: 'object',
          properties: {
            url: { $ref: 'schema:breadcrum:bookmark:base#/properties/url' },
          },
          required: ['url'],
        },
        {
          type: 'boolean',
        },
        {
          type: 'null',
        },
      ],
    },
  },
})

export default schemaBookmarkCreate
