export const userJsonSchema = {
  id: { type: 'string', format: 'uuid' },
  email: { type: 'string', format: 'email' },
  username: { type: 'string' },
  email_confirmed: { type: 'boolean' },
  created_at: { type: 'string', format: 'date-time' },
  updated_at: { type: 'string', format: 'date-time' },
  pending_email_update: { type: 'string', format: 'email' },
  newsletter_subscription: { type: 'boolean' },
  disabled_email: { type: 'boolean' }
}
