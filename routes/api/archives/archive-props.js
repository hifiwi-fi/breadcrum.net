export const commonArchiveProps = {
  url: { type: 'string', format: 'uri' },
  title: { type: 'string' },
  site_name: { type: 'string' },
  html_content: { type: 'string' },
  length: { type: 'integer' },
  excerpt: { type: 'string' },
  byline: { type: 'string' },
  direction: { type: 'string' },
  language: { type: 'string' },
  ready: { type: 'boolean' },
  error: { type: 'string' }
}

export const fullArchiveProps = {
  id: { type: 'string', format: 'uuid' },
  ...commonArchiveProps,
  created_at: { type: 'string', format: 'date-time' },
  updated_at: { type: 'string', format: 'date-time' },
  display_title: { type: 'string' }
}

export const createArchiveProp = {
  createArchive: {
    anyOf: [
      {
        type: 'object',
        properties: {
          url: { type: 'string', format: 'uri' }
        },
        required: [
          'uri'
        ]
      },
      {
        type: 'boolean'
      },
      {
        type: 'null'
      }
    ]
  }
}
