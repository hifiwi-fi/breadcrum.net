import { schemaBookmarkBase } from './schema-bookmark-base.js'

/**
 * @import { JSONSchema, FromSchema } from 'json-schema-to-ts'
 * @typedef {typeof schemaBookmarkCreate} SchemaBookmarkCreate
 * @typedef {FromSchema<SchemaBookmarkCreate>} TypeBookmarkCreate
 */

export const schemaBookmarkCreate = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  $id: 'schema:breadcrum:bookmark:create',
  additionalProperties: false,
  required: ['url'],
  properties: {
    ...schemaBookmarkBase.properties,
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

export default schemaBookmarkCreate
