/**
 * @import { JSONSchema, FromSchema } from 'json-schema-to-ts'
 */

const emailPattern = /** @type {const} */("^[a-zA-Z0-9.!#$%&''*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$") // eslint-disable-line no-useless-escape

export const userEditableUserProps = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  properties: {
    username: {
      type: 'string',
      minLength: 1,
      maxLength: 50,
      pattern: '^[A-Za-z0-9]+(?:[._-][A-Za-z0-9]+)*$',
    },
    email: {
      type: 'string',
      format: 'email',
      maxLength: 200,
      pattern: emailPattern,
    },
    password: {
      type: 'string',
      minLength: 8,
      maxLength: 255,
    },
    newsletter_subscription: { type: 'boolean' },
  }
})

// TODO: is this needed?

const commonSerlializedUserProps = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  properties: {
    username: userEditableUserProps.properties.username,
    email: userEditableUserProps.properties.email,
    email_confirmed: { type: 'boolean' },
    pending_email_update: {
      type: 'string',
      format: 'email',
      nullable: true,
      pattern: emailPattern,
    },
    newsletter_subscription: userEditableUserProps.properties.newsletter_subscription,
    admin: { type: 'boolean' },
    disabled_email: {
      type: 'boolean',
      description: 'Indicates if the user\'s email address has been disabled due to abuse or delivery issues. Contact support to resolve.',
    },
    disabled: {
      type: 'boolean',
      description: 'Indicates if the user account has been disabled by mods.',
    },
    disabled_reason: {
      type: 'string',
      nullable: true,
      description: 'A note presented to the user regarding their account disabled status.',
    },
  }
})

export const fullSerializedUserProps = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  additionalProperties: false,
  properties: {
    id: { type: 'string', format: 'uuid' },
    ...commonSerlializedUserProps.properties,
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' },
  }
})

/**
 * @typedef {typeof tokenWithUserProps} SchemaTokenWithUser
 * @typedef {FromSchema<SchemaTokenWithUser>} TypeTokenWithUser
 * @typedef {FromSchema<SchemaTokenWithUser>} TypeTokenWithUserClient - Client-side type without date deserialization (dates are strings)
 */

export const tokenWithUserProps = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  required: ['token', 'user'],
  additionalProperties: false,
  properties: {
    token: {
      type: 'string',
    },
    user: {
      type: 'object',
      required: [
        'id',
        'username',
        'email',
        'email_confirmed',
        'created_at',
        'admin',
        'newsletter_subscription'
      ],
      additionalProperties: false,
      properties: {
        ...fullSerializedUserProps.properties,
      },
    },
  },
})
