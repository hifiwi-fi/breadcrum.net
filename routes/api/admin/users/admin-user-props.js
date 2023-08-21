import { fullSerializedUserProps } from '../../user/user-props.js'

const adminUserProps = {
  internal_note: {
    type: 'string',
    description: 'Any notes related to a user account. This value is private to the moderation of the website and should not be sent to users.'
  }
}

export const fullSerializedAdminUserProps = {
  ...fullSerializedUserProps,
  ...adminUserProps
}
