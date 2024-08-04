import { userEditableUserProps } from './user-base.js'

/**
 * @import { JSONSchema, FromSchema } from 'json-schema-to-ts'
 * @typedef {typeof schemaUserUpdate} SchemaUserUpdate
 * @typedef {FromSchema<SchemaUserUpdate, {
 *   deserialize: [{ pattern: { type: 'string'; format: 'date-time'; }; output: Date; }]
 * }>} TypeUserUpdate
 */

export const schemaUserUpdate = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  $id: 'schema:breadcrum:user:update',
  additionalProperties: false,
  minProperties: 1,
  properties: {
    ...userEditableUserProps.properties,
  },
})
