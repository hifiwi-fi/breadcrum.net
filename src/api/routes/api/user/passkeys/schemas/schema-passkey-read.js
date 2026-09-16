import { passkeyProps } from './passkey-base.js'

/**
 * @import { JSONSchema, FromSchema } from 'json-schema-to-ts'
 * @typedef {typeof schemaPasskeyRead} SchemaPasskeyRead
 * @typedef {FromSchema<SchemaPasskeyRead, {
 *   deserialize: [{ pattern: { type: 'string'; format: 'date-time'; }; output: Date | null; }]
 * }>} TypePasskeyReadSerialize
 * @typedef {FromSchema<SchemaPasskeyRead>} TypePasskeyReadClient
 */

export const schemaPasskeyRead = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  $id: 'schema:breadcrum:passkey:read',
  additionalProperties: false,
  required: ['id', 'credential_id', 'name', 'created_at', 'updated_at', 'last_used', 'transports', 'aaguid'],
  properties: {
    ...passkeyProps.properties,
  }
})
