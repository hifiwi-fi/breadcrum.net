import { schemaAuthTokenRead } from './schema-auth-token-read.js'

/**
 * @import { JSONSchema, FromSchema } from 'json-schema-to-ts'
 * @typedef {typeof schemaAuthTokenCreateResponse} SchemaAuthTokenCreateResponse
 * @typedef {FromSchema<SchemaAuthTokenCreateResponse, {
 *   deserialize: [{ pattern: { type: 'string'; format: 'date-time'; }; output: Date; }]
 * }>} TypeAuthTokenCreateResponseSerialize
 * @typedef {FromSchema<SchemaAuthTokenCreateResponse>} TypeAuthTokenCreateResponseClient
 */

export const schemaAuthTokenCreateResponse = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  $id: 'schema:breadcrum:auth-token:create-response',
  additionalProperties: false,
  properties: {
    token: {
      type: 'string',
      description: 'The JWT token string',
    },
    auth_token: schemaAuthTokenRead,
  },
  required: ['token', 'auth_token'],
})
