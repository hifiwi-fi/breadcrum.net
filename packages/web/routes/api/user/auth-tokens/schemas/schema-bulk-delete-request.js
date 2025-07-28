/**
 * @import { JSONSchema, FromSchema } from 'json-schema-to-ts'
 * @typedef {typeof schemaBulkDeleteRequest} SchemaBulkDeleteRequest
 * @typedef {FromSchema<SchemaBulkDeleteRequest, {
 *   deserialize: [{ pattern: { type: 'string'; format: 'date-time'; }; output: Date; }]
 * }>} TypeBulkDeleteRequest
 */

export const schemaBulkDeleteRequest = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  $id: 'schema:breadcrum:auth-token:bulk-delete-request',
  additionalProperties: false,
  properties: {
    last_seen_before: {
      type: 'string',
      format: 'date-time',
      description: 'Delete tokens that were last seen before this date',
    },
    dry_run: {
      type: 'boolean',
      description: 'If true, shows what would be deleted without actually deleting',
      default: false
    },
    allow_recent_deletes: {
      type: 'boolean',
      description: 'Required to delete tokens used within the last 7 days',
      default: false
    },
  },
  required: ['last_seen_before'],
})
