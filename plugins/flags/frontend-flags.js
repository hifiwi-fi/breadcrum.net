export const defaultFrontendFlags = {
  registration: {
    type: 'boolean',
    default: false,
    description: 'Enable or disable user registration'
  },
  registration_invite_required: {
    type: 'boolean',
    default: false,
    description: 'Require an invite code to register'
  },
  email_confirmation_banner: {
    type: 'boolean',
    default: false,
    description: 'Show the email confirmation banner when email address is unconfirmed'
  }
}
