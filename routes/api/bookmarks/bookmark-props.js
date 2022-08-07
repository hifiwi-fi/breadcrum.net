
export const commnonBookmarkProps = {
  url: { type: 'string', format: 'uri' },
  title: { type: 'string' },
  note: { type: 'string' },
  starred: { type: 'boolean' },
  toread: { type: 'boolean' },
  sensitive: { type: 'boolean' },
  tags: {
    type: ['array', 'null'],
    items: {
      type: 'string', minLength: 1, maxLength: 255
    }
  }
}

export const fullBookmarkProps = {
  id: { type: 'string', format: 'uuid' },
  ...commnonBookmarkProps,
  created_at: { type: 'string', format: 'date-time' },
  updated_at: { type: 'string', format: 'date-time' },
  episodes: {
    type: ['array', 'null'],
    items: {
      type: 'object',
      properties: {
        episode_id: { type: 'string', format: 'uuid' },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' },
        url: { type: 'string', format: 'uri' },
        type: { enum: ['redirect'] },
        medium: { enum: ['video', 'audio'] },
        size_in_bytes: { type: 'integer' },
        duration_in_seconds: { type: 'integer' },
        mime_type: { type: 'string' },
        explicite: { type: 'boolean' },
        author_name: { type: 'string' },
        filename: { type: 'string' },
        ext: { type: 'string' },
        src_type: { type: 'string' },
        ready: { type: 'boolean' },
        error: { type: 'string' }
      }
    }
  }
}

export const createEpisodeProp = {
  createEpisode: {
    anyOf: [
      {
        type: 'object',
        properties: {
          type: { enum: ['redirect'] },
          medium: { enum: ['video', 'audio'] }
        }
      },
      {
        type: 'null'
      }
    ]
  }
}
