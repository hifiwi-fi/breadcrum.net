export const userProps = {
  id: { type: 'string', format: 'uuid' },
  email: { type: 'string', format: 'email' },
  username: { type: 'string' },
  email_confirmed: { type: 'boolean' },
  created_at: { type: 'string', format: 'date-time' },
  updated_at: { type: 'string', format: 'date-time' },
  pending_email_update: { type: 'string', format: 'email' },
  newsletter_subscription: { type: 'boolean' },
  disabled_email: { type: 'boolean', description: 'Indicates if the user\'s email address has been disabled due to abuse or delivery issues. Contact support to resolve.' },
  disabled: { type: 'boolean', description: 'Indicates if the user account has been disabled by mods.' },
  disabled_reason: { type: 'string', description: 'A note presented to the user regarding their account disabled status.' }
}

export const validatedUserProps = {
  username: {
    ...userProps.username,
    minLength: 1,
    maxLength: 50,
    pattern: '^[A-Za-z0-9]+(?:[._-][A-Za-z0-9]+)*$'
  },
  email: {
    ...userProps.email,
    maxLength: 200,
    pattern: "^[a-zA-Z0-9.!#$%&''*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$" // eslint-disable-line no-useless-escape
  },
  password: {
    type: 'string',
    minLength: 8,
    maxLength: 255
  },
  newsletter_subscription: {
    ...userProps.newsletter_subscription
  }
}

export const tokenWithUserProps = {
  token: {
    type: 'string'
  },
  user: {
    type: 'object',
    properties: {
      ...userProps
    }
  }
}
