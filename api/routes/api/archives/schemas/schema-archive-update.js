import { archiveProps } from './archive-base.js'

/**
 * @import { JSONSchema, FromSchema } from 'json-schema-to-ts'
 * @typedef {typeof schemaArchiveUpdate} SchemaArchiveUpdate
 * @typedef {FromSchema<SchemaArchiveUpdate>} TypeArchiveUpdate
 */

export const schemaArchiveUpdate = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  $id: 'schema:breadcrum:archive:update',
  additionalProperties: false,
  minProperties: 1,
  properties: {
    ...archiveProps.properties
  },
})
