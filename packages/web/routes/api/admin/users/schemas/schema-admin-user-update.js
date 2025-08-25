/**
 * @import { JSONSchema, FromSchema } from 'json-schema-to-ts'
 * @typedef {typeof schemaAdminUserUpdate} SchemaAdminUserUpdate
 * @typedef {FromSchema<SchemaAdminUserUpdate>} SchemaTypeAdminUserUpdateClient
 */

import { fullSerializedUserProps, userEditableUserProps } from '../../../user/schemas/user-base.js'
import { adminUserProps } from './schema-admin-user-read.js'

export const schemaAdminUserUpdate = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  additionalProperties: false,
  minProperties: 1,
  properties: {
    username: userEditableUserProps.properties.username,
    email: userEditableUserProps.properties.email,
    newsletter_subscription: userEditableUserProps.properties.newsletter_subscription,
    email_confirmed: fullSerializedUserProps.properties.email_confirmed,
    pending_email_update: fullSerializedUserProps.properties.pending_email_update,
    disabled_email: fullSerializedUserProps.properties.disabled_email,
    disabled: fullSerializedUserProps.properties.disabled,
    disabled_reason: fullSerializedUserProps.properties.disabled_reason,
    internal_note: adminUserProps.properties.internal_note,
  }
})
