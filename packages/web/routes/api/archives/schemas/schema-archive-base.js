/**
 * @import { JSONSchema } from 'json-schema-to-ts'
 * @typedef {typeof schemaArchiveBase} SchemaArchiveBase
 */

export const schemaArchiveBase = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  $id: 'schema:breadcrum:archive:base',
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
  },
})

export default schemaArchiveBase
