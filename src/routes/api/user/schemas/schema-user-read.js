import { fullSerializedUserProps } from './user-base.js'

/**
 * @import { JSONSchema, FromSchema } from 'json-schema-to-ts'
 * @typedef {typeof schemaUserRead} SchemaUserRead
 * @typedef {FromSchema<SchemaUserRead, {
 *   deserialize: [{ pattern: { type: 'string'; format: 'date-time'; }; output: Date; }]
 * }>} TypeUserRead
 * @typedef {FromSchema<SchemaUserRead>} TypeUserReadClient - Client-side type without date deserialization (dates are strings)
 */

export const schemaUserRead = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  $id: 'schema:breadcrum:user:read',
  required: [
    'id',
    'username',
    'email',
    'email_confirmed',
    'created_at',
    'admin',
    'newsletter_subscription'
  ],
  additionalProperties: false,
  properties: {
    ...fullSerializedUserProps.properties,
  },
})
