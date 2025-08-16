/**
 * @import { JSONSchema, FromSchema } from 'json-schema-to-ts'
 * @typedef {typeof schemaEpisodePreview} SchemaEpisodePreview
 * @typedef {FromSchema<SchemaEpisodePreview>} TypeEpisodePreview
 */

export const schemaEpisodePreview = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  $id: 'schema:breadcrum:episode:preview',
  additionalProperties: false,
  properties: {
    title: {
      type: 'string',
      nullable: true
    },
    ext: {
      type: 'string',
      nullable: true
    },
    url: {
      type: 'string',
      nullable: true
    },
    duration: {
      type: 'number',
      nullable: true
    },
    channel: {
      type: 'string',
      nullable: true
    },
    src_type: {
      type: 'string',
      nullable: true
    },
    filesize_approx: {
      type: 'number',
      nullable: true
    },
  },
})
