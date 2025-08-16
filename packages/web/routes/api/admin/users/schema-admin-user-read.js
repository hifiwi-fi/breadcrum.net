import { fullSerializedAdminUserProps } from './admin-user-props.js'

/**
 * @import { JSONSchema, FromSchema } from 'json-schema-to-ts'
 * @typedef {typeof schemaAdminUserRead} SchemaAdminUserRead
 * @typedef {FromSchema<SchemaAdminUserRead>} TypeAdminUserRead
 */

export const schemaAdminUserRead = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  $id: 'schema:breadcrum:admin-user:read',
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
    ...fullSerializedAdminUserProps.properties,
  },
})

export default schemaAdminUserRead
