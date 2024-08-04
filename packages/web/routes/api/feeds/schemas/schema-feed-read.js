import { feedProps, feedReadProps } from './feed-base.js'

/**
 * @import { JSONSchema } from 'json-schema-to-ts'
 * @typedef {typeof schemaFeedRead} SchemaFeedRead
 */

export const schemaFeedRead = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  $id: 'schema:breadcrum:feed:read',
  required: ['id', 'created_at', 'title', 'description', 'explicit', 'image_url', 'default_feed', 'feed_url', 'token'],
  properties: {
    ...feedReadProps.properties,
    ...feedProps.properties,
  },
  additionalProperties: false,
})
export default schemaFeedRead
