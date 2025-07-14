/**
 * @import { JSONSchema, FromSchema } from 'json-schema-to-ts'
 * @typedef {typeof schemaBulkDeleteResponse} SchemaBulkDeleteResponse
 * @typedef {FromSchema<SchemaBulkDeleteResponse, {
 *   deserialize: [{ pattern: { type: 'string'; format: 'date-time'; }; output: Date; }]
 * }>} TypeBulkDeleteResponse
 */

export const schemaBulkDeleteResponse = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  $id: 'schema:breadcrum:auth-token:bulk-delete-response',
  additionalProperties: false,
  properties: {
    deleted_count: {
      type: 'integer',
      minimum: 0,
      description: 'Number of tokens deleted (or would be deleted in dry run)',
    },
    deleted_tokens: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          jti: {
            type: 'string',
            format: 'uuid',
            description: 'The JWT ID of the deleted token',
          },
          last_seen: {
            type: 'string',
            format: 'date-time',
            description: 'When the token was last used',
          },
        },
        required: ['jti', 'last_seen'],
      },
      description: 'List of deleted tokens (or tokens that would be deleted in dry run)',
    },
    dry_run: {
      type: 'boolean',
      description: 'Indicates if this was a dry run (no actual deletion)',
    },
  },
  required: ['deleted_count', 'deleted_tokens'],
})
