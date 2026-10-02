/**
 * @import { JSONSchema } from 'json-schema-to-ts'
 */

export const episodeProps = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  properties: {
    podcast_feed_id: { type: 'string', format: 'uuid' },
    url: { type: 'string', format: 'uri' },
    title: { type: 'string', minLength: 1, maxLength: 255 },
    type: { enum: ['redirect'] },
    medium: { enum: ['video', 'audio'] },
    size_in_bytes: { type: 'integer' },
    duration_in_seconds: { type: 'integer' },
    mime_type: { type: 'string' },
    explicit: { type: 'boolean' },
    author_name: { type: 'string' },
    filename: { type: 'string' },
    ext: { type: 'string' },
    src_type: { type: 'string' },
    thumbnail: { type: 'string' },
    oembed: {
      type: 'object',
      nullable: true,
      additionalProperties: true,
      properties: {
        type: { type: 'string', nullable: true },
        provider_name: { type: 'string', nullable: true },
        provider_url: { type: 'string', nullable: true },
        html: { type: 'string', nullable: true },
        width: { type: 'integer', nullable: true },
        height: { type: 'integer', nullable: true },
        thumbnail_url: { type: 'string', nullable: true },
        title: { type: 'string', nullable: true },
      },
    },
    published_time: { type: 'string', format: 'date-time', nullable: true },
    text_content: { type: 'string' },
    author_url: { type: 'string' },
    ready: { type: 'boolean' },
    error: { type: 'string' },
  },
})

export const episodeReadProps = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' },
    display_title: { type: 'string', minLength: 1, maxLength: 255 },
  },
})
