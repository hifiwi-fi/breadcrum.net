import { episodeReadProps, episodeProps } from './episode-base.js'

/**
 * @import { JSONSchema, FromSchema } from 'json-schema-to-ts'
 * @typedef {typeof schemaEpisodeJoin} SchemaEpisodeJoin
 * @typedef {FromSchema<SchemaEpisodeJoin, {
 *   deserialize: [{ pattern: { type: 'string'; format: 'date-time'; }; output: Date; }]
 * }>} TypeEpisodeRead
 */

export const schemaEpisodeJoin = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  $id: 'schema:breadcrum:episode:join',
  additionalProperties: false,
  properties: {
    ...episodeReadProps.properties,
    ...episodeProps.properties,
  }
})
