/**
 * @import { JSONSchema, FromSchema } from 'json-schema-to-ts'
 * @typedef {typeof schemaBillingSubscriptionRead} SchemaBillingSubscriptionRead
 * @typedef {FromSchema<SchemaBillingSubscriptionRead, {
 *   deserialize: [{ pattern: { type: 'string'; format: 'date-time'; }; output: Date; }]
 * }>} TypeBillingSubscriptionRead
 * @typedef {FromSchema<SchemaBillingSubscriptionRead>} TypeBillingSubscriptionReadClient
 */

export const schemaBillingSubscriptionRead = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  $id: 'schema:breadcrum:billing:subscription:read',
  additionalProperties: false,
  required: ['active', 'subscription', 'usage'],
  properties: {
    active: {
      type: 'boolean',
    },
    subscription: {
      type: 'object',
      additionalProperties: false,
      required: [
        'provider',
        'display_name',
        'status',
        'current_period_end',
        'cancel_at',
        'cancel_at_period_end',
        'trial_end',
        'payment_method',
      ],
      properties: {
        provider: {
          type: 'string',
          nullable: true,
        },
        display_name: {
          type: 'string',
          nullable: true,
        },
        status: {
          type: 'string',
          nullable: true,
        },
        current_period_end: {
          type: 'string',
          format: 'date-time',
          nullable: true,
        },
        cancel_at: {
          type: 'string',
          format: 'date-time',
          nullable: true,
        },
        cancel_at_period_end: {
          type: 'boolean',
        },
        trial_end: {
          type: 'string',
          format: 'date-time',
          nullable: true,
        },
        payment_method: {
          type: 'object',
          nullable: true,
          additionalProperties: false,
          required: ['brand', 'last4'],
          properties: {
            brand: { type: 'string', nullable: true },
            last4: { type: 'string', nullable: true },
          },
        },
      },
    },
    usage: {
      type: 'object',
      additionalProperties: false,
      required: [
        'bookmarks_this_month',
        'bookmarks_limit',
        'window_start',
        'window_end',
      ],
      properties: {
        bookmarks_this_month: {
          type: 'integer',
        },
        bookmarks_limit: {
          type: 'integer',
          nullable: true,
        },
        window_start: {
          type: 'string',
          format: 'date-time',
        },
        window_end: {
          type: 'string',
          format: 'date-time',
        },
      },
    },
  },
})
