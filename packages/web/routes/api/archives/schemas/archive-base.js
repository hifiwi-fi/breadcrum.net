/**
 * @import { JSONSchema } from 'json-schema-to-ts'
 */

export const archiveProps = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  properties: {
    url: { type: 'string', format: 'uri' },
    title: { type: 'string' },
    site_name: { type: 'string' },
    html_content: { type: 'string' },
    text_content: { type: 'string' },
    length: { type: 'integer' },
    excerpt: { type: 'string' },
    byline: { type: 'string' },
    direction: { type: 'string' },
    language: { type: 'string' },
    ready: { type: 'boolean' },
    error: { type: 'string' },
    done: { type: 'boolean' }
  },
})

export const archiveReadProps = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' },
    extraction_method: { enum: ['server', 'client'] },
    display_title: { type: 'string' }
  },
})
