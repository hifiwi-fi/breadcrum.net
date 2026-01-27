export const defaultBackendFlags = /** @type {const} */ {
  placeholder_url: {
    type: 'string',
    default: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // rick roll
    description: 'The default file to inject into empty feeds',
  },
  // billing_enabled is a frontend flag also available to backend routes via getFlags({ frontend: true })
  subscriptions_required: {
    type: 'boolean',
    default: false,
    description: 'Enforce paid subscriptions or free tier quotas',
  },
}
