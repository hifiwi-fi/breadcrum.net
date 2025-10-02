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
        required: ['name', 'policy', 'retry_limit', 'retry_delay', 'retry_backoff', 'retry_delay_max', 'expire_seconds', 'retention_seconds', 'deletion_seconds', 'dead_letter', 'partition', 'deferred_count', 'queued_count', 'active_count', 'total_count', 'monitor_on', 'maintain_on', 'created_on', 'updated_on'],
        properties: {
          name: { type: 'string', description: 'Queue name' },
          policy: { type: 'string', description: 'Queue policy' },
          retry_limit: { type: 'integer', description: 'Maximum retry attempts' },
          retry_delay: { type: 'integer', description: 'Delay between retries in seconds' },
          retry_backoff: { type: 'boolean', description: 'Use exponential backoff for retries' },
          retry_delay_max: { type: 'integer', nullable: true, description: 'Maximum retry delay in seconds for exponential backoff' },
          expire_seconds: { type: 'integer', description: 'Job expiration time in seconds' },
          retention_seconds: { type: 'integer', description: 'How long to keep queued jobs in seconds' },
          deletion_seconds: { type: 'integer', description: 'How long to keep completed jobs in seconds' },
          dead_letter: { type: 'string', nullable: true, description: 'Dead letter queue name' },
          partition: { type: 'boolean', description: 'Whether queue uses dedicated partition table' },
          deferred_count: { type: 'integer', description: 'Number of deferred jobs (cached)' },
          queued_count: { type: 'integer', description: 'Number of queued jobs (cached)' },
          active_count: { type: 'integer', description: 'Number of active jobs (cached)' },
          total_count: { type: 'integer', description: 'Total number of jobs (cached)' },
          monitor_on: { type: 'string', nullable: true, format: 'date-time', description: 'Last time queue was monitored' },
          maintain_on: { type: 'string', nullable: true, format: 'date-time', description: 'Last time queue was maintained' },
          created_on: { type: 'string', format: 'date-time', description: 'Queue creation time' },
          updated_on: { type: 'string', format: 'date-time', description: 'Last update time' },
        }
      }
    }
  }
})
