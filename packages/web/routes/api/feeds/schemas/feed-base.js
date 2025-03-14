/**
 * @import { JSONSchema } from 'json-schema-to-ts'
 */

export const feedProps = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  properties: {
    title: { type: 'string', maxLength: 255 },
    description: { type: 'string', maxLength: 30_000 },
    image_url: { type: 'string', format: 'uri' },
    explicit: { type: 'boolean' },
  },
  // required: ['title', 'description']
})

export const feedReadProps = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' },
    token: { type: 'string' },
    feed_url: { type: 'string', format: 'uri' },
    default_feed: { type: 'boolean' },
  },
})
