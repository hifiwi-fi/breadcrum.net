import { fullSerializedUserProps } from '../../../user/schemas/user-base.js'

/**
 * @import { JSONSchema, FromSchema } from 'json-schema-to-ts'
 * Paginated
 * @typedef {typeof schemaAdminUsersRead} SchemaAdminUsersRead
 * @typedef {FromSchema<SchemaAdminUsersRead>} SchemaTypeAdminUsersReadClient
 * Singular
 * @typedef {typeof schemaAdminUserRead} SchemaAdminUserRead
 * @typedef {FromSchema<SchemaAdminUserRead>} SchemaTypeAdminUserReadClient
 */

export const adminUserProps = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  properties: {
    internal_note: {
      type: 'string',
      nullable: true,
      description: 'Any notes related to a user account. This value is private to the moderation of the website and should not be sent to users.',
    },
  }
})

export const schemaAdminUserRead = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  additionalProperties: false,
  $id: 'schema:breadcrum:admin-user:read',
  required: [
    'id',
    'username',
    'email',
    'email_confirmed',
    'created_at',
    'updated_at',
    'admin',
    'newsletter_subscription',
  ],
  properties: {
    ...fullSerializedUserProps.properties,
    ...adminUserProps.properties,
  }
})

export const schemaAdminUsersRead = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  additionalProperties: false,
  required: ['data', 'pagination'],
  properties: {
    data: {
      type: 'array',
      items: schemaAdminUserRead,
    },
    pagination: {
      type: 'object',
      additionalProperties: false,
      required: [
        'top',
        'bottom',
        'before',
        'after'
      ],
      properties: {
        before: { type: 'string', format: 'date-time', nullable: true },
        after: { type: 'string', format: 'date-time', nullable: true },
        top: { type: 'boolean' },
        bottom: { type: 'boolean' },
      },
    },
  },
})
