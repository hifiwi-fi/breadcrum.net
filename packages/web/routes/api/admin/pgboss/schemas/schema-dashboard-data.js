/**
 * @import { JSONSchema, FromSchema } from 'json-schema-to-ts'
 * @import { TypeSummaryRead } from './schema-summary-read.js'
 * @import { TypeJobsRead } from './schema-jobs-read.js'
 * @import { TypeMaintenanceRead } from './schema-maintenance-read.js'
 *
 * @typedef {Object} TypeDashboardData
 * @property {TypeSummaryRead} summary
 * @property {Object} states - Queue states data
 * @property {TypeJobsRead} jobs
 * @property {TypeMaintenanceRead} maintenance
 */

export const schemaDashboardData = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  $id: 'schema:breadcrum:pgboss:dashboard:data',
  additionalProperties: false,
  required: ['summary', 'states', 'jobs', 'maintenance'],
  properties: {
    summary: {
      type: 'object',
      additionalProperties: false,
      required: ['healthy', 'totals', 'queues', 'recent_failures', 'maintenance'],
      properties: {
        healthy: {
          type: 'boolean',
          description: 'Overall health status'
        },
        totals: {
          type: 'object',
          additionalProperties: false,
          required: ['jobs', 'active', 'pending', 'completed', 'failed'],
          properties: {
            jobs: { type: 'integer' },
            active: { type: 'integer' },
            pending: { type: 'integer' },
            completed: { type: 'integer' },
            failed: { type: 'integer' }
          }
        },
        queues: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['name', 'active', 'pending', 'completed', 'failed', 'total'],
            properties: {
              name: { type: 'string' },
              active: { type: 'integer' },
              pending: { type: 'integer' },
              completed: { type: 'integer' },
              failed: { type: 'integer' },
              total: { type: 'integer' }
            }
          }
        },
        recent_failures: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['id', 'name', 'created_on', 'completed_on', 'retry_count', 'output'],
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              created_on: { type: 'string' },
              completed_on: { type: 'string' },
              retry_count: { type: 'integer' },
              output: {
                type: 'object',
                nullable: true,
                additionalProperties: true
              }
            }
          }
        },
        maintenance: {
          type: 'object',
          additionalProperties: false,
          required: ['last_run', 'overdue'],
          properties: {
            last_run: {
              type: 'string',
              nullable: true
            },
            overdue: { type: 'boolean' }
          }
        }
      }
    },
    states: {
      type: 'object',
      additionalProperties: true,
      description: 'Queue states data'
    },
    jobs: {
      type: 'object',
      additionalProperties: false,
      required: ['jobs', 'pagination'],
      properties: {
        jobs: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['id', 'name', 'state', 'priority', 'retry_count', 'retry_limit', 'created_on', 'started_on', 'completed_on', 'keep_until', 'data', 'output', 'singleton_key'],
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              state: { type: 'string' },
              priority: { type: 'integer' },
              retry_count: { type: 'integer' },
              retry_limit: { type: 'integer' },
              created_on: { type: 'string' },
              started_on: { type: 'string', nullable: true },
              completed_on: { type: 'string', nullable: true },
              keep_until: { type: 'string' },
              data: { type: 'object', additionalProperties: true },
              output: { type: 'object', nullable: true, additionalProperties: true },
              singleton_key: { type: 'string', nullable: true }
            }
          }
        },
        pagination: {
          type: 'object',
          additionalProperties: false,
          required: ['total', 'offset', 'limit', 'hasMore'],
          properties: {
            total: { type: 'integer' },
            offset: { type: 'integer' },
            limit: { type: 'integer' },
            hasMore: { type: 'boolean' }
          }
        }
      }
    },
    maintenance: {
      type: 'object',
      additionalProperties: false,
      required: ['version', 'maintained_on', 'monitored_on', 'maintenance_interval_seconds', 'monitor_interval_seconds', 'archive_completed_after_seconds', 'archive_failed_after_seconds', 'delete_after_days', 'is_installed'],
      properties: {
        version: { type: 'integer', nullable: true },
        maintained_on: { type: 'string', nullable: true },
        monitored_on: { type: 'string', nullable: true },
        maintenance_interval_seconds: { type: 'integer' },
        monitor_interval_seconds: { type: 'integer' },
        archive_completed_after_seconds: { type: 'integer' },
        archive_failed_after_seconds: { type: 'integer' },
        delete_after_days: { type: 'integer' },
        is_installed: { type: 'boolean' }
      }
    }
  }
})

/**
 * @typedef {FromSchema<typeof schemaDashboardData>} TypeDashboardDataRead
 */
