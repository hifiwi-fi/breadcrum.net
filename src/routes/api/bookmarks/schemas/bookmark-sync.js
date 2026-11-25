import { bookmarkProps } from './bookmark-base.js'
import { schemaBookmarkUpdate } from './schema-bookmark-update.js'
import { tagProps } from '../../tags/schemas/tags-base.js'

/**
 * @import { FromSchema, JSONSchema } from 'json-schema-to-ts'
 * @typedef {FromSchema<typeof bookmarkSyncReceipt>} BookmarkSyncReceipt
 * @typedef {FromSchema<typeof bookmarkSyncUpdate>} BookmarkSyncUpdate
 * @typedef {FromSchema<typeof editValues>} BookmarkEditValues
 */

const id = /** @type {const} */ ({ type: 'string', format: 'uuid' })
const flag = bookmarkProps.properties.starred
const scalarProperties = /** @type {const} */ ({
  title: { ...bookmarkProps.properties.title, nullable: true, pattern: '^[^\\u0000]*$' },
  note: { ...bookmarkProps.properties.note, nullable: true, pattern: '^[^\\u0000]*$' },
  summary: { ...bookmarkProps.properties.summary, nullable: true, pattern: '^[^\\u0000]*$' },
  starred: flag,
  toread: flag,
  sensitive: flag,
})

const editValues = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  additionalProperties: false,
  properties: scalarProperties,
})

export const bookmarkSyncHeaders = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  properties: {
    'idempotency-key': { ...id, description: '**Alpha (unstable).** Opt in to a retained sync receipt. Retry with the same operation UUID and request.' },
  },
})

export const bookmarkSyncUpdate = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  additionalProperties: false,
  minProperties: 1,
  properties: {
    ...schemaBookmarkUpdate.properties,
    title: { ...schemaBookmarkUpdate.properties.title, nullable: true },
    note: { ...schemaBookmarkUpdate.properties.note, nullable: true },
    summary: { ...schemaBookmarkUpdate.properties.summary, nullable: true },
    sync: {
      type: 'object',
      description: '**Alpha (unstable).** Include with Idempotency-Key to compare starting values and apply independent changes.',
      additionalProperties: false,
      required: ['base'],
      properties: {
        base: editValues,
        tags: {
          type: 'array',
          minItems: 1,
          maxItems: 200,
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['name', 'present'],
            properties: { name: { ...tagProps, pattern: '^[^\\u0000]*$' }, present: flag },
          },
        },
      },
    },
  },
  anyOf: [
    { required: ['sync'], properties: scalarProperties },
    { not: { required: ['sync'] }, properties: schemaBookmarkUpdate.properties },
  ],
})

const disposition = /** @type {const} */ ({ enum: ['applied', 'already_applied', 'conflict'] })

export const bookmarkSyncReceipt = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  description: '**Alpha (unstable).** Retained outcome for a keyed request, including the bookmark ID and any field dispositions.',
  additionalProperties: false,
  required: ['operation_id', 'bookmark_id', 'outcome', 'fields', 'tags'],
  properties: {
    operation_id: id,
    bookmark_id: id,
    outcome: { enum: ['created', 'existing', 'deleted', 'processed', 'bookmark_missing'] },
    fields: {
      type: 'object',
      additionalProperties: false,
      properties: {
        title: disposition,
        note: disposition,
        summary: disposition,
        starred: disposition,
        toread: disposition,
        sensitive: disposition,
      },
    },
    tags: {
      type: 'array',
      description: 'Tag dispositions in request order.',
      items: { enum: ['applied', 'already_applied'] },
    },
  },
})
