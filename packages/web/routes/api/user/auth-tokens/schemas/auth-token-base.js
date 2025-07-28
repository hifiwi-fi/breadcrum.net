/**
 * @import { JSONSchema } from 'json-schema-to-ts'
 */

export const authTokenProps = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  required: [],
  properties: {
    jti: {
      type: 'string',
      format: 'uuid',
      description: 'The unique identifier of the JWT auth token',
    },
    source: {
      type: 'string',
      enum: ['web', 'api']
    },
    created_at: {
      type: 'string',
      format: 'date-time',
      description: 'When the token was created',
    },
    updated_at: {
      type: 'string',
      format: 'date-time',
      description: 'When the token was last updated',
    },
    last_seen: {
      type: 'string',
      format: 'date-time',
      description: 'When the token was last used',
    },
    user_agent: {
      type: 'object',
      additionalProperties: false,
      nullable: true,
      description: 'The parsed user agent information from the last request',
      properties: {
        family: {
          type: 'string',
          description: 'The name of the browser',
        },
        major: {
          type: 'string',
          description: 'Major version of the browser',
        },
        minor: {
          type: 'string',
          description: 'Minor version of the browser',
        },
        patch: {
          type: 'string',
          description: 'Patch version of the browser',
        },
        device: {
          type: 'object',
          description: 'The device family',
          additionalProperties: false,
          required: ['family', 'major', 'minor', 'patch'],
          properties: {
            family: {
              type: 'string',
              description: 'The name of the device',
            },
            major: {
              type: 'string',
              description: 'Major version of the device',
            },
            minor: {
              type: 'string',
              description: 'Minor version of the device',
            },
            patch: {
              type: 'string',
              description: 'Patch version of the device',
            },
          }
        },
        os: {
          type: 'object',
          description: 'The operating system',
          additionalProperties: false,
          required: ['family', 'major', 'minor', 'patch'],
          properties: {
            family: {
              type: 'string',
              description: 'The name of the operating system',
            },
            major: {
              type: 'string',
              description: 'Major version of the operating system',
            },
            minor: {
              type: 'string',
              description: 'Minor version of the operating system',
            },
            patch: {
              type: 'string',
              description: 'Patch version of the operating system',
            },
          }
        },
        raw: {
          type: 'string',
          description: 'The raw useraagent string'
        }
      },
      required: ['family', 'major', 'minor', 'patch', 'device', 'os', 'raw']
    },
    ip: {
      type: ['string'],
      nullable: true,
      description: 'The last IP address used with this token',
    },
    note: {
      type: ['string'],
      maxLength: 255,
      nullable: true,
      description: 'A note to identify the session (e.g., "Work laptop", "Home PC")',
    },
    protect: {
      type: 'boolean',
      description: 'When true, prevents the token from being bulk deleted',
    },
  }
})
