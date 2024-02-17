export const commnonBookmarkProps = {
  url: { type: 'string', format: 'uri' },
  title: { type: 'string', minLength: 1, maxLength: 255 },
  note: { type: 'string' },
  starred: { type: 'boolean' },
  toread: { type: 'boolean' },
  sensitive: { type: 'boolean' },
  tags: {
    type: 'array',
    items: {
      type: 'string', minLength: 1, maxLength: 255
    }
  },
  archive_urls: {
    type: 'array',
    items: {
      type: 'string',
      format: 'uri'
    }
  },
  summary: { type: 'string' } // for client side extracted descriptions as fallbacks
}

export const fullBookmarkProps = {
  id: { type: 'string', format: 'uuid' },
  ...commnonBookmarkProps,
  created_at: { type: 'string', format: 'date-time' },
  updated_at: { type: 'string', format: 'date-time' }
}
