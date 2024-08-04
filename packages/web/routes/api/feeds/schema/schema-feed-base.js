/**
 * @import { JSONSchema } from 'json-schema-to-ts'
 * @typedef {typeof schemaFeedBase} SchemaFeedBase
 */

export const schemaFeedBase = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  $id: 'schema:breadcrum:feed:base',
  properties: {
    title: { type: 'string', maxLength: 255 },
    description: { type: 'string', maxLength: 30_000 },
    image_url: { type: 'string', format: 'uri' },
    explicit: { type: 'boolean' },
  },
  required: ['title', 'description']
})

export default schemaFeedBase
