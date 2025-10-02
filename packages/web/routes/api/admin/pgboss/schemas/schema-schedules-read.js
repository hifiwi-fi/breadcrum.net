/**
 * @import { JSONSchema, FromSchema } from 'json-schema-to-ts'
 * @typedef {typeof schemaSchedulesRead} SchemaSchedulesRead
 * @typedef {FromSchema<SchemaSchedulesRead>} TypeSchedulesRead
 */

export const schemaSchedulesRead = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  $id: 'schema:breadcrum:pgboss:schedules:read',
  additionalProperties: false,
  required: ['schedules'],
  properties: {
    schedules: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'key', 'cron', 'timezone', 'data', 'options', 'created_on', 'updated_on'],
        properties: {
          name: { type: 'string', description: 'Schedule name' },
          key: { type: 'string', description: 'Schedule key (unique identifier for multiple schedules per queue)' },
          cron: { type: 'string', description: 'Cron expression' },
          timezone: { type: 'string', description: 'Timezone for cron execution' },
          data: { type: 'object', nullable: true, additionalProperties: true, description: 'Job data template' },
          options: { type: 'object', nullable: true, additionalProperties: true, description: 'Job options' },
          created_on: { type: 'string', format: 'date-time', description: 'Schedule creation time' },
          updated_on: { type: 'string', format: 'date-time', description: 'Last update time' },
        }
      }
    }
  }
})
