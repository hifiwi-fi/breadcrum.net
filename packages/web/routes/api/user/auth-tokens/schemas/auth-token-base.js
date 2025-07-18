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
    updated_at: {
      type: 'string',
      format: 'date-time',
      description: 'When the token was last updated',
    },
    user_agent: {
      type: ['string'],
      nullable: true,
      description: 'The last user agent used with this token',
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
      default: null,
      description: 'A note to identify the session (e.g., "Work laptop", "Home PC")',
    },
    protect: {
      type: 'boolean',
      default: false,
      description: 'When true, prevents the token from being bulk deleted',
    },
  }
})
