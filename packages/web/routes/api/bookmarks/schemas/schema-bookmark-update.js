import { schemaBookmarkCreate } from './schema-bookmark-create.js'

/**
 * @import { JSONSchema, FromSchema } from 'json-schema-to-ts'
 * @typedef {typeof schemaBookmarkUpdate} SchemaBookmarkUpdate
 * @typedef {FromSchema<SchemaBookmarkUpdate>} TypeBookmarkUpdate
 */

export const schemaBookmarkUpdate = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  $id: 'schema:breadcrum:bookmark:update',
  additionalProperties: false,
  minProperties: 1,
  properties: {
    ...schemaBookmarkCreate.properties,
    createEpisode: {
      anyOf: [
        {
          type: 'object',
          properties: {
            type: { enum: ['redirect'] },
            medium: { enum: ['video', 'audio'] },
            url: { type: 'string', format: 'uri' },
          },
          required: [
            'type', 'medium', 'url'
          ],
        },
        {
          type: 'null',
        },
      ],
    },
    createArchive: {
      anyOf: [
        {
          type: 'object',
          properties: {
            url: { type: 'string', format: 'uri' },
          },
          required: [
            'uri',
          ],
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
