import { archiveProps, archiveReadProps } from './archive-base.js'

/**
 * @import { JSONSchema, FromSchema } from 'json-schema-to-ts'
 * @typedef {typeof schemaArchiveJoin} SchemaArchiveJoin
 * @typedef {FromSchema<SchemaArchiveJoin, {
 *   deserialize: [{ pattern: { type: 'string'; format: 'date-time'; }; output: Date; }]
 * }>} TypeArchiveRead
 */

export const schemaArchiveJoin = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  $id: 'schema:breadcrum:archive:join',
  additionalProperties: false,
  required: ['created_at', 'url', 'extraction_method'],
  properties: {
    ...archiveReadProps.properties,
    ...archiveProps.properties,
  },
})
