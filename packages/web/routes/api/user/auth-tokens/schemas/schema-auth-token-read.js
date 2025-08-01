import { authTokenProps } from './auth-token-base.js'

/**
 * @import { JSONSchema, FromSchema } from 'json-schema-to-ts'
 * @typedef {typeof schemaAuthTokenRead} SchemaAuthTokenRead
 * @typedef {FromSchema<SchemaAuthTokenRead, {
 *   deserialize: [{ pattern: { type: 'string'; format: 'date-time'; }; output: Date; }]
 * }>} TypeAuthTokenReadSerialize
 * @typedef {FromSchema<SchemaAuthTokenRead>} TypeAuthTokenReadClient
 */

export const schemaAuthTokenRead = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  $id: 'schema:breadcrum:auth-token:read',
  additionalProperties: false,
  required: ['jti', 'created_at', 'last_seen', 'updated_at', 'is_current', 'protect', 'note', 'user_agent', 'ip', 'source'],
  properties: {
    ...authTokenProps.properties,
    is_current: {
      type: 'boolean',
      description: 'Whether this token is the one currently being used for this request',
    },
  }
})
