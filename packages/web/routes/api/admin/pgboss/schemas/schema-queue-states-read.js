/**
 * @import { JSONSchema, FromSchema } from 'json-schema-to-ts'
 * @typedef {typeof schemaQueueStatesRead} SchemaQueueStatesRead
 * @typedef {FromSchema<SchemaQueueStatesRead>} TypeQueueStatesRead
 */

export const schemaQueueStatesRead = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  $id: 'schema:breadcrum:pgboss:queue-states:read',
  additionalProperties: false,
  required: ['created', 'retry', 'active', 'completed', 'cancelled', 'failed', 'all', 'queues'],
  properties: {
    created: { type: 'number', description: 'Jobs waiting to be processed' },
    retry: { type: 'number', description: 'Jobs scheduled for retry' },
    active: { type: 'number', description: 'Jobs currently being processed' },
    completed: { type: 'number', description: 'Jobs successfully completed' },
    cancelled: { type: 'number', description: 'Jobs that were cancelled' },
    failed: { type: 'number', description: 'Jobs that failed processing' },
    all: { type: 'number', description: 'Total number of jobs' },
    queues: {
      type: 'object',
      description: 'Per-queue state breakdowns',
      additionalProperties: {
        type: 'object',
        additionalProperties: false,
        required: ['created', 'retry', 'active', 'completed', 'cancelled', 'failed', 'all'],
        properties: {
          created: { type: 'number' },
          retry: { type: 'number' },
          active: { type: 'number' },
          completed: { type: 'number' },
          cancelled: { type: 'number' },
          failed: { type: 'number' },
          all: { type: 'number' },
        }
      }
    }
  }
})
