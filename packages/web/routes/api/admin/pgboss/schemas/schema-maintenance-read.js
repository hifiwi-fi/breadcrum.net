/**
 * @import { JSONSchema, FromSchema } from 'json-schema-to-ts'
 * @typedef {typeof schemaMaintenanceRead} SchemaMaintenanceRead
 * @typedef {FromSchema<SchemaMaintenanceRead>} TypeMaintenanceRead
 */

export const schemaMaintenanceRead = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  $id: 'schema:breadcrum:pgboss:maintenance:read',
  additionalProperties: false,
  required: [
    'version',
    'last_supervise',
    'last_maintenance',
    'supervise_interval_seconds',
    'maintenance_interval_seconds',
    'delete_after_seconds',
    'is_installed',
    'supervision_overdue',
    'maintenance_overdue'
  ],
  properties: {
    version: {
      type: 'integer',
      nullable: true,
      description: 'pg-boss schema version'
    },
    last_supervise: {
      type: 'string',
      nullable: true,
      format: 'date-time',
      description: 'Last supervision run time (monitoring + maintenance)'
    },
    last_maintenance: {
      type: 'string',
      nullable: true,
      format: 'date-time',
      description: 'Last maintenance run time (from most recent queue)'
    },
    supervise_interval_seconds: {
      type: 'integer',
      description: 'Supervision interval in seconds (default 60)'
    },
    maintenance_interval_seconds: {
      type: 'integer',
      description: 'Maintenance interval in seconds (default 86400)'
    },
    delete_after_seconds: {
      type: 'integer',
      description: 'Delete completed jobs after seconds (default 604800 = 7 days)'
    },
    is_installed: {
      type: 'boolean',
      description: 'Whether pg-boss is properly installed'
    },
    supervision_overdue: {
      type: 'boolean',
      description: 'Whether supervision is overdue (> 2x supervise_interval_seconds)'
    },
    maintenance_overdue: {
      type: 'boolean',
      description: 'Whether maintenance is overdue (> 2x maintenance_interval_seconds)'
    }
  }
})
