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
    created_at: {
      type: 'string',
      format: 'date-time',
      description: 'When the token was created',
    },
    last_seen: {
      type: 'string',
      format: 'date-time',
      description: 'When the token was last used',
    },
    user_agent: {
      type: ['string', 'null'],
      description: 'The last user agent used with this token',
    },
    ip: {
      type: ['string', 'null'],
      description: 'The last IP address used with this token',
    },
  }
})

export const authTokenReadProps = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  required: ['jti', 'created_at', 'last_seen', 'is_current', 'last_seen_micros'],
  properties: {
    last_seen_micros: {
      type: 'string',
      description: 'Microsecond precision timestamp for pagination',
    },
    is_current: {
      type: 'boolean',
      description: 'Whether this token is the one currently being used for this request',
    },
  }
})
