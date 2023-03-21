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
