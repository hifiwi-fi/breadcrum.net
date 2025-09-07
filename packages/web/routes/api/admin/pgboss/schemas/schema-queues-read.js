/**
 * @import { JSONSchema, FromSchema } from 'json-schema-to-ts'
 * @typedef {typeof schemaQueuesRead} SchemaQueuesRead
 * @typedef {FromSchema<SchemaQueuesRead>} TypeQueuesRead
 */

export const schemaQueuesRead = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  $id: 'schema:breadcrum:pgboss:queues:read',
  additionalProperties: false,
  required: ['queues'],
  properties: {
    queues: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'policy', 'retry_limit', 'retry_delay', 'retry_backoff', 'expire_seconds', 'retention_minutes', 'dead_letter', 'created_on', 'updated_on'],
        properties: {
          name: { type: 'string', description: 'Queue name' },
          policy: { type: 'string', description: 'Queue policy' },
          retry_limit: { type: 'integer', description: 'Maximum retry attempts' },
          retry_delay: { type: 'integer', description: 'Delay between retries in seconds' },
          retry_backoff: { type: 'boolean', description: 'Use exponential backoff for retries' },
          expire_seconds: { type: 'integer', description: 'Job expiration time in seconds' },
          retention_minutes: { type: 'integer', description: 'How long to keep completed jobs in minutes' },
          dead_letter: { type: 'string', nullable: true, description: 'Dead letter queue name' },
          created_on: { type: 'string', format: 'date-time', description: 'Queue creation time' },
          updated_on: { type: 'string', format: 'date-time', description: 'Last update time' },
        }
      }
    }
  }
})
