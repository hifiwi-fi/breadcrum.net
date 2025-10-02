/**
 * @import { JSONSchema, FromSchema } from 'json-schema-to-ts'
 * @typedef {typeof schemaSummaryRead} SchemaSummaryRead
 * @typedef {FromSchema<SchemaSummaryRead>} TypeSummaryRead
 */

export const schemaSummaryRead = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  $id: 'schema:breadcrum:pgboss:summary:read',
  additionalProperties: false,
  required: ['healthy', 'totals', 'queues', 'recent_failures', 'maintenance'],
  properties: {
    healthy: {
      type: 'boolean',
      description: 'Overall health status'
    },
    totals: {
      type: 'object',
      description: 'Total job counts across all queues',
      additionalProperties: false,
      required: ['jobs', 'active', 'pending', 'failed'],
      properties: {
        jobs: { type: 'integer', description: 'Total number of jobs' },
        active: { type: 'integer', description: 'Currently processing jobs' },
        pending: { type: 'integer', description: 'Jobs waiting to be processed (created + retry)' },
        failed: { type: 'integer', description: 'Failed jobs' },
      }
    },
    queues: {
      type: 'array',
      description: 'Summary for each queue',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'active', 'pending', 'failed', 'total'],
        properties: {
          name: { type: 'string', description: 'Queue name' },
          active: { type: 'integer', description: 'Active jobs in this queue' },
          pending: { type: 'integer', description: 'Pending jobs in this queue' },
          failed: { type: 'integer', description: 'Failed jobs in this queue' },
          total: { type: 'integer', description: 'Total jobs in this queue' },
        }
      }
    },
    recent_failures: {
      type: 'array',
      description: 'Recent failed jobs',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'name', 'created_on', 'completed_on', 'retry_count', 'output'],
        properties: {
          id: { type: 'string', format: 'uuid', description: 'Job ID' },
          name: { type: 'string', description: 'Queue name' },
          created_on: { type: 'string', format: 'date-time', description: 'When job was created' },
          completed_on: { type: 'string', format: 'date-time', description: 'When job failed' },
          retry_count: { type: 'integer', description: 'Number of retry attempts' },
          output: {
            type: 'object',
            nullable: true,
            additionalProperties: true,
            description: 'Error output'
          },
        }
      }
    },
    maintenance: {
      type: 'object',
      description: 'Maintenance status',
      additionalProperties: false,
      required: ['last_run', 'overdue'],
      properties: {
        last_run: {
          type: 'string',
          nullable: true,
          format: 'date-time',
          description: 'Last maintenance run'
        },
        overdue: { type: 'boolean', description: 'Whether maintenance is overdue' },
      }
    }
  }
})
