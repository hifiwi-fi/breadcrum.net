import { schemaArchiveBase } from './schema-archive-base.js'

/**
 * @import { JSONSchema } from 'json-schema-to-ts'
 * @typedef {typeof schemaArchiveRead} SchemaArchiveRead
 */

export const schemaArchiveRead = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  $id: 'schema:breadcrum:archive:read',
  unevaluatedProperties: false,
  properties: {
    id: { type: 'string', format: 'uuid' },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' },
    extraction_method: { enum: ['server', 'client'] },
    display_title: { type: 'string' },
    ...schemaArchiveBase.properties,
  },
})
export default schemaArchiveRead
