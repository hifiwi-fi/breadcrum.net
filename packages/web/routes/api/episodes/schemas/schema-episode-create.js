/**
 * @import { JSONSchema } from 'json-schema-to-ts'
 * @typedef {typeof schemaEpisodeCreate} SchemaEpisodeCreate
 */

export const schemaEpisodeCreate = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  $id: 'schema:breadcrum:episode:create',
  properties: {
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
            'type', 'medium',
          ],
        },
        {
          type: 'null',
        },
      ],
    },
  },
})

export default schemaEpisodeCreate
