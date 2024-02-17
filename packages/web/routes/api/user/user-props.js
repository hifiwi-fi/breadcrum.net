const emailPattern = "^[a-zA-Z0-9.!#$%&''*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$" // eslint-disable-line no-useless-escape

export const userEditableUserProps = {
  username: {
    type: 'string',
    minLength: 1,
    maxLength: 50,
    pattern: '^[A-Za-z0-9]+(?:[._-][A-Za-z0-9]+)*$'
  },
  email: {
    type: 'string',
    format: 'email',
    maxLength: 200,
    pattern: emailPattern
  },
  password: {
    type: 'string',
    minLength: 8,
    maxLength: 255
  },
  newsletter_subscription: { type: 'boolean' }
}

// TODO: is this needed?
const commonSerlializedUserProps = {
  username: userEditableUserProps.username,
  email: userEditableUserProps.email,
  email_confirmed: { type: 'boolean' },
  pending_email_update: {
    type: 'string',
    format: 'email',
    pattern: emailPattern
  },
  newsletter_subscription: userEditableUserProps.newsletter_subscription,
  admin: { type: 'boolean' },
  disabled_email: {
    type: 'boolean',
    description: 'Indicates if the user\'s email address has been disabled due to abuse or delivery issues. Contact support to resolve.'
  },
  disabled: {
    type: 'boolean',
    description: 'Indicates if the user account has been disabled by mods.'
  },
  disabled_reason: {
    type: 'string',
    description: 'A note presented to the user regarding their account disabled status.'
  }
}

export const fullSerializedUserProps = {
  id: { type: 'string', format: 'uuid' },
  ...commonSerlializedUserProps,
  created_at: { type: 'string', format: 'date-time' },
  updated_at: { type: 'string', format: 'date-time' }
}

export const tokenWithUserProps = {
  token: {
    type: 'string'
  },
  user: {
    type: 'object',
    properties: {
      ...fullSerializedUserProps
    }
  }
}
