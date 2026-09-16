import { episodeProps } from './episode-base.js'

/**
 * @import { JSONSchema, FromSchema } from 'json-schema-to-ts'
 * @typedef {typeof schemaEpisodeUpdate} SchemaEpisodeUpdate
 * @typedef {FromSchema<SchemaEpisodeUpdate>} TypeEpisodeUpdate
 */

export const schemaEpisodeUpdate = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  $id: 'schema:breadcrum:episode:update',
  additionalProperties: false,
  minProperties: 1,
  properties: {
    ...episodeProps.properties,
  }
})
