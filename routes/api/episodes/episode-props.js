export const commonEpisodeProps = {
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

export const fullEpisodeProps = {
  id: { type: 'string', format: 'uuid' },
  ...commonEpisodeProps,
  created_at: { type: 'string', format: 'date-time' },
  updated_at: { type: 'string', format: 'date-time' }
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
