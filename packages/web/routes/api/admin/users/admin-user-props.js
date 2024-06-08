import { fullSerializedUserProps, userEditableUserProps } from '../../user/user-props.js'

const adminUserProps = {
  internal_note: {
    type: 'string',
    description: 'Any notes related to a user account. This value is private to the moderation of the website and should not be sent to users.',
  },
}

export const fullSerializedAdminUserProps = {
  ...fullSerializedUserProps,
  ...adminUserProps,
}

export const adminEditableUserProps = {
  username: userEditableUserProps.username,
  email: userEditableUserProps.email,
  newsletter_subscription: userEditableUserProps.newsletter_subscription,
  email_confirmed: fullSerializedUserProps.email_confirmed,
  pending_email_update: fullSerializedUserProps.pending_email_update,
  disabled_email: fullSerializedUserProps.disabled_email,
  disabled: fullSerializedUserProps.disabled,
  disabled_reason: fullSerializedUserProps.disabled_reason,
  internal_note: adminUserProps.internal_note,
}
