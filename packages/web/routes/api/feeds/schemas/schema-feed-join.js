import { feedProps, feedReadProps } from './feed-base.js'
// import { schemaFeedRead } from './schema-feed-read.js'

/**
 * @import { JSONSchema, FromSchema } from 'json-schema-to-ts'
 * @typedef {typeof schemaFeedJoin} SchemaFeedJoin
  * @typedef {FromSchema<SchemaFeedJoin, {
 *   deserialize: [{ pattern: { type: 'string'; format: 'date-time'; }; output: Date; }]
 * }>} TypeFeedJoin
 */

export const schemaFeedJoin = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  $id: 'schema:breadcrum:feed:join',
  // required: schemaFeedRead.required,
  additionalProperties: false,
  properties: {
    ...feedReadProps.properties,
    ...feedProps.properties,
  },
})
