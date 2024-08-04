import schemaEpisodeBase from './schema-episode-base.js'

/**
 * @import { JSONSchema } from 'json-schema-to-ts'
 * @typedef {typeof schemaEpisodeRead} SchemaEpisodeRead
 */

export const schemaEpisodeRead = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  $id: 'schema:breadcrum:episode:read',
  unevaluatedProperties: false,
  properties: {
    id: { type: 'string', format: 'uuid' },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' },
    display_title: { type: 'string', minLength: 1, maxLength: 255 },
    ...schemaEpisodeBase.properties,
  },
})
export default schemaEpisodeRead
