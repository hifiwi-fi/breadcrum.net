/**
 * @import { JSONSchema, FromSchema } from 'json-schema-to-ts'
 * @typedef {typeof schemaBillingSession} SchemaBillingSession
 * @typedef {FromSchema<SchemaBillingSession>} TypeBillingSession
 */

export const schemaBillingSession = /** @type {const} @satisfies {JSONSchema} */ ({
  $id: 'schema:breadcrum:billing:session',
  type: 'object',
  additionalProperties: false,
  required: ['url'],
  properties: {
    url: {
      type: 'string',
    },
  },
})
