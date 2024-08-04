/**
 * @import { JSONSchema } from 'json-schema-to-ts'
 */

export const tagProps = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'string',
  minLength: 1,
  maxLength: 255,
})
