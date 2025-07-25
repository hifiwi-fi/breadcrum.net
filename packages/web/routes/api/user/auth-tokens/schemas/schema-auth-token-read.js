import { authTokenProps } from './auth-token-base.js'

/**
 * @import { JSONSchema, FromSchema } from 'json-schema-to-ts'
 * @typedef {typeof schemaAuthTokenRead} SchemaAuthTokenRead
 * @typedef {FromSchema<SchemaAuthTokenRead, {
 *   deserialize: [{ pattern: { type: 'string'; format: 'date-time'; }; output: Date; }]
 * }>} TypeAuthTokenRead
 */

export const authTokenReadProps = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  required: ['jti', 'created_at', 'last_seen', 'is_current', 'last_seen_micros'],
  properties: {
    last_seen_micros: {
      type: 'string',
      description: 'Microsecond precision timestamp for pagination',
    },
    is_current: {
      type: 'boolean',
      description: 'Whether this token is the one currently being used for this request',
    },
  }
})

export const schemaAuthTokenRead = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  $id: 'schema:breadcrum:auth-token:read',
  additionalProperties: false,
  required: ['jti', 'created_at', 'last_seen', 'updated_at', 'is_current', 'last_seen_micros', 'protect'],
  properties: {
    ...authTokenProps.properties,
    ...authTokenReadProps.properties,
  }
})
