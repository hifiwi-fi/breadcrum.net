/**
 * @import { JSONSchema, FromSchema } from 'json-schema-to-ts'
 * @typedef {typeof schemaMaintenanceRead} SchemaMaintenanceRead
 * @typedef {FromSchema<SchemaMaintenanceRead>} TypeMaintenanceRead
 */

export const schemaMaintenanceRead = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  $id: 'schema:breadcrum:pgboss:maintenance:read',
  additionalProperties: false,
  required: ['version', 'maintained_on', 'monitored_on', 'maintenance_interval_seconds', 'monitor_interval_seconds', 'archive_completed_after_seconds', 'archive_failed_after_seconds', 'delete_after_days', 'is_installed'],
  properties: {
    version: {
      type: 'integer',
      nullable: true,
      description: 'pg-boss schema version'
    },
    maintained_on: {
      type: 'string',
      nullable: true,
      format: 'date-time',
      description: 'Last maintenance run time'
    },
    monitored_on: {
      type: 'string',
      nullable: true,
      format: 'date-time',
      description: 'Last monitor run time'
    },
    maintenance_interval_seconds: {
      type: 'integer',
      description: 'Maintenance interval in seconds'
    },
    monitor_interval_seconds: {
      type: 'integer',
      description: 'Monitor interval in seconds'
    },
    archive_completed_after_seconds: {
      type: 'integer',
      description: 'Archive completed jobs after seconds'
    },
    archive_failed_after_seconds: {
      type: 'integer',
      description: 'Archive failed jobs after seconds'
    },
    delete_after_days: {
      type: 'integer',
      description: 'Delete archived jobs after days'
    },
    is_installed: {
      type: 'boolean',
      description: 'Whether pg-boss is properly installed'
    }
  }
})
