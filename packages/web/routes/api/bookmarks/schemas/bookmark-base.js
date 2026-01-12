/**
 * @import { JSONSchema } from 'json-schema-to-ts'
 */

export const bookmarkProps = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  required: [],
  properties: {
    url: { type: 'string', format: 'uri' },
    title: { type: 'string', minLength: 1, maxLength: 255 },
    note: { type: 'string' },
    starred: { type: 'boolean' },
    toread: { type: 'boolean' },
    sensitive: { type: 'boolean' },
    archive_urls: {
      type: 'array',
      items: {
        type: 'string',
        format: 'uri',
      },
    },
    summary: { type: 'string' }, // for client side extracted descriptions as fallbacks
  }
})

export const bookmarkReadProps = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  required: [
    'id',
    'url',
    'created_at',
    'updated_at',
    'starred',
    'toread',
    'sensitive',
    'archive_urls'
  ],
  properties: {
    id: { type: 'string', format: 'uuid' },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' },
    done: { type: 'boolean' },
  }
})
