export const defaultFrontendFlags = /** @type {const} */ {
  registration: {
    type: 'boolean',
    default: true,
    description: 'Enable or disable user registration',
  },
  registration_invite_required: {
    type: 'boolean',
    default: false,
    description: 'Require an invite code to register',
  },
}
