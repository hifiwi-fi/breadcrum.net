/**
 * @import { JSONSchema, FromSchema } from 'json-schema-to-ts'
 * @typedef {typeof schemaAdminSubscriptionUpdate} SchemaAdminSubscriptionUpdate
 * @typedef {FromSchema<SchemaAdminSubscriptionUpdate>} SchemaTypeAdminSubscriptionUpdate
 */

export const schemaAdminSubscriptionUpdate = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  additionalProperties: false,
  required: ['display_name'],
  properties: {
    status: {
      type: 'string',
      default: 'active',
      description: 'Subscription status (typically "active").',
    },
    plan_code: {
      type: 'string',
      default: 'yearly_paid',
      description: 'Plan code for the subscription.',
    },
    display_name: {
      type: 'string',
      minLength: 1,
      description: 'Human-readable label (e.g. "Friends & Family", "Gift").',
    },
    current_period_end: {
      type: 'string',
      format: 'date-time',
      nullable: true,
      description: 'End of the subscription period. Null for lifetime.',
    },
  },
})
