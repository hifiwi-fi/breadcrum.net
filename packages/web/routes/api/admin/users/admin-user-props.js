import { fullSerializedUserProps, userEditableUserProps } from '../../user/schemas/user-base.js'

/**
 * @import { JSONSchema } from 'json-schema-to-ts'
 */

const adminUserProps = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  properties: {
    internal_note: {
      type: 'string',
      description: 'Any notes related to a user account. This value is private to the moderation of the website and should not be sent to users.',
    },
  }
})

export const fullSerializedAdminUserProps = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  properties: {
    ...fullSerializedUserProps.properties,
    ...adminUserProps.properties,
  }
})

export const adminEditableUserProps = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
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
