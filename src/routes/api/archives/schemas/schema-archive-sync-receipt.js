/**
 * @import { FromSchema, JSONSchema } from 'json-schema-to-ts'
 * @typedef {FromSchema<typeof archiveSyncReceipt>} ArchiveSyncReceipt
 */

const id = /** @type {const} */ ({ type: 'string', format: 'uuid' })
const nullableId = /** @type {const} */ ({ ...id, nullable: true })

export const archiveSyncReceipt = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  description: '**Alpha (unstable).** Retained outcome and affected IDs for a keyed archive operation.',
  additionalProperties: false,
  required: ['operation_id', 'bookmark_id', 'archive_id', 'outcome'],
  properties: {
    operation_id: id,
    bookmark_id: nullableId,
    archive_id: nullableId,
    outcome: { enum: ['archive_created', 'archive_deleted', 'archive_missing', 'bookmark_missing'] },
  },
})
