import { fullSerializedUserProps } from '../../../user/schemas/user-base.js'
import { authTokenProps, geoipRegionProps } from '../../../user/auth-tokens/schemas/auth-token-base.js'

/**
 * @import { JSONSchema, FromSchema } from 'json-schema-to-ts'
 * Paginated
 * @typedef {typeof schemaAdminUsersRead} SchemaAdminUsersRead
 * @typedef {FromSchema<SchemaAdminUsersRead>} SchemaTypeAdminUsersReadClient
 * Singular
 * @typedef {typeof schemaAdminUserRead} SchemaAdminUserRead
 * @typedef {FromSchema<SchemaAdminUserRead>} SchemaTypeAdminUserReadClient
 */

export const adminUserProps = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  properties: {
    internal_note: {
      type: 'string',
      nullable: true,
      description: 'Any notes related to a user account. This value is private to the moderation of the website and should not be sent to users.',
    },
    last_seen: {
      type: 'string',
      format: 'date-time',
      nullable: true,
      description: 'The last time the user was seen (from their most recent auth token).',
    },
    ip: {
      type: 'string',
      nullable: true,
      description: 'The IP address from the user\'s most recent auth token.',
    },
    user_agent: {
      ...authTokenProps.properties.user_agent,
      description: 'The parsed user agent information from the user\'s most recent auth token.',
    },
    geoip: {
      ...geoipRegionProps,
      description: 'GeoIP region data for the user\'s most recent auth token IP.',
    },
    registration_ip: {
      type: 'string',
      nullable: true,
      description: 'The IP address used during account registration.',
    },
    registration_user_agent: {
      ...authTokenProps.properties.user_agent,
      description: 'The parsed user agent information from account registration.',
    },
    registration_geoip: {
      ...geoipRegionProps,
      description: 'GeoIP region data for the user\'s registration IP.',
    },
    subscription_provider: {
      type: 'string',
      nullable: true,
      description: 'Subscription provider (stripe or custom).',
    },
    subscription_status: {
      type: 'string',
      nullable: true,
      description: 'Current subscription status (e.g., active, canceled, past_due).',
    },
    subscription_plan: {
      type: 'string',
      nullable: true,
      description: 'Current subscription plan code (e.g., yearly_paid).',
    },
    subscription_display_name: {
      type: 'string',
      nullable: true,
      description: 'Human-readable label for custom subscriptions (e.g., Friends & Family).',
    },
    subscription_period_end: {
      type: 'string',
      format: 'date-time',
      nullable: true,
      description: 'End of the current billing period.',
    },
    subscription_cancel_at_period_end: {
      type: 'boolean',
      nullable: true,
      description: 'Whether the subscription is set to cancel at period end.',
    },
    stripe_customer_id: {
      type: 'string',
      nullable: true,
      description: 'Stripe customer ID for linking to Stripe dashboard.',
    },
  }
})

export const schemaAdminUserRead = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  additionalProperties: false,
  $id: 'schema:breadcrum:admin-user:read',
  required: [
    'id',
    'username',
    'email',
    'email_confirmed',
    'created_at',
    'updated_at',
    'admin',
    'newsletter_subscription',
  ],
  properties: {
    ...fullSerializedUserProps.properties,
    ...adminUserProps.properties,
  }
})

export const schemaAdminUsersRead = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  additionalProperties: false,
  required: ['data', 'pagination'],
  properties: {
    data: {
      type: 'array',
      items: schemaAdminUserRead,
    },
    pagination: {
      type: 'object',
      additionalProperties: false,
      required: [
        'top',
        'bottom',
        'before',
        'after'
      ],
      properties: {
        before: { type: 'string', format: 'date-time', nullable: true },
        after: { type: 'string', format: 'date-time', nullable: true },
        top: { type: 'boolean' },
        bottom: { type: 'boolean' },
      },
    },
  },
})
