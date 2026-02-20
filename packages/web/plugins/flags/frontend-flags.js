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
  service_notice_message: {
    type: 'string',
    default: '',
    description: 'Service notice banner message (non-dismissible)',
  },
  service_notice_message_color: {
    type: 'string',
    default: '',
    description: 'Background color for the service notice banner (non-dismissible). Leave empty for default.',
  },
  service_notice_dismissible_message: {
    type: 'string',
    default: '',
    description: 'Service notice banner message (dismissible)',
  },
  service_notice_dismissible_message_color: {
    type: 'string',
    default: '',
    description: 'Background color for the service notice banner (dismissible). Leave empty for default.',
  },
  billing_enabled: {
    type: 'boolean',
    default: false,
    description: 'Show billing and subscription UI to users',
  },
  free_bookmarks_per_month: {
    type: 'number',
    default: 10,
    description: 'Monthly bookmark quota for free tier users',
  },
}
