import { authTokenProps } from './auth-token-base.js'

/**
 * @import { JSONSchema, FromSchema } from 'json-schema-to-ts'
 * @typedef {typeof schemaAuthTokenCreate} SchemaAuthTokenCreate
 * @typedef {FromSchema<SchemaAuthTokenCreate>} TypeAuthTokenCreate
 */

export const schemaAuthTokenCreate = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  $id: 'schema:breadcrum:auth-token:create',
  additionalProperties: false,
  properties: {
    note: authTokenProps.properties.note,
    protect: authTokenProps.properties.protect,
  },
  required: ['protect'],
})
