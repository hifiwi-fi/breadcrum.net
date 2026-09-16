import { authTokenProps } from './auth-token-base.js'

/**
 * @import { JSONSchema, FromSchema } from 'json-schema-to-ts'
 * @typedef {typeof schemaAuthTokenUpdate} SchemaAuthTokenUpdate
 * @typedef {FromSchema<SchemaAuthTokenUpdate>} TypeAuthTokenUpdate
 */

export const schemaAuthTokenUpdate = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  $id: 'schema:breadcrum:auth-token:update',
  additionalProperties: false,
  properties: {
    note: authTokenProps.properties.note,
    protect: authTokenProps.properties.protect,
  },
  anyOf: [
    { required: ['note'] },
    { required: ['protect'] },
  ],
})
