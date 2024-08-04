/**
 * @import { JSONSchema } from 'json-schema-to-ts'
 * @typedef {typeof schemaFeedRead} SchemaFeedRead
 */

export const schemaFeedRead = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  $id: 'schema:breadcrum:feed:read',
  allOf: [
    { $ref: 'schema:breadcrum:feed:base' },
    {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' },
        token: { type: 'string' },
        feed_url: { type: 'string', format: 'uri' },
        default_feed: { type: 'boolean' },
      },
    },
  ],
})
export default schemaFeedRead
