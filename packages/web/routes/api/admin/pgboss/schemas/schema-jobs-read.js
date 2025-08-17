/**
 * @import { JSONSchema, FromSchema } from 'json-schema-to-ts'
 * @typedef {typeof schemaJobsRead} SchemaJobsRead
 * @typedef {FromSchema<SchemaJobsRead>} TypeJobsRead
 */

export const schemaJobsRead = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  $id: 'schema:breadcrum:pgboss:jobs:read',
  additionalProperties: false,
  required: ['jobs', 'pagination'],
  properties: {
    jobs: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'name', 'state', 'priority', 'retry_count', 'retry_limit', 'created_on', 'completed_on', 'keep_until', 'data'],
        properties: {
          id: { type: 'string', format: 'uuid', description: 'Job ID' },
          name: { type: 'string', description: 'Queue name' },
          state: { type: 'string', description: 'Current job state' },
          priority: { type: 'integer', description: 'Job priority' },
          retry_count: { type: 'integer', description: 'Number of retry attempts' },
          retry_limit: { type: 'integer', description: 'Maximum retry attempts' },
          created_on: { type: 'string', nullable: true, format: 'date-time', description: 'Job creation time' },
          started_on: {
            type: 'string',
            nullable: true,
            format: 'date-time',
            description: 'Job start time'
          },
          completed_on: {
            type: 'string',
            nullable: true,
            format: 'date-time',
            description: 'Job completion time'
          },
          keep_until: { type: 'string', format: 'date-time', description: 'Job retention time' },
          data: {
            type: 'object',
            additionalProperties: true,
            description: 'Job payload'
          },
          output: {
            type: 'object',
            nullable: true,
            additionalProperties: true,
            description: 'Job output'
          },
          singleton_key: {
            type: 'string',
            nullable: true,
            description: 'Singleton key if applicable'
          },
        }
      }
    },
    pagination: {
      type: 'object',
      additionalProperties: false,
      required: ['total', 'offset', 'limit', 'hasMore'],
      properties: {
        total: { type: 'integer', description: 'Total number of jobs matching filters' },
        offset: { type: 'integer', description: 'Current offset' },
        limit: { type: 'integer', description: 'Current limit' },
        hasMore: { type: 'boolean', description: 'Whether there are more results' }
      }
    }
  }
})
