export const commonEpisodeProps = {
  podcast_feed_id: { type: 'string', format: 'uuid' },
  url: { type: 'string', format: 'uri' },
  title: { type: 'string', minLength: 1, maxLength: 255 },
  type: { enum: ['redirect'] },
  medium: { enum: ['video', 'audio'] },
  size_in_bytes: { type: 'integer' },
  duration_in_seconds: { type: 'integer' },
  mime_type: { type: 'string' },
  explicit: { type: 'boolean' },
  author_name: { type: 'string' },
  filename: { type: 'string' },
  ext: { type: 'string' },
  src_type: { type: 'string' },
  thumbnail: { type: 'string' },
  text_content: { type: 'string' },
  author_url: { type: 'string' },
  ready: { type: 'boolean' },
  error: { type: 'string' }
}

export const fullEpisodeProps = {
  id: { type: 'string', format: 'uuid' },
  ...commonEpisodeProps,
  created_at: { type: 'string', format: 'date-time' },
  updated_at: { type: 'string', format: 'date-time' },
  display_title: { type: 'string', minLength: 1, maxLength: 255 }
}

export const createEpisodeProp = {
  createEpisode: {
    anyOf: [
      {
        type: 'object',
        properties: {
          type: { enum: ['redirect'] },
          medium: { enum: ['video', 'audio'] },
          url: { type: 'string', format: 'uri' }
        },
        required: [
          'type', 'medium'
        ]
      },
      {
        type: 'null'
      }
    ]
  }
}
