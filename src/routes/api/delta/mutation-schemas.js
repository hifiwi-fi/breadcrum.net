import { bookmarkProps } from '../bookmarks/schemas/bookmark-base.js'
import { tagProps } from '../tags/schemas/tags-base.js'

/**
 * @import { FromSchema, JSONSchema } from 'json-schema-to-ts'
 * @typedef {FromSchema<typeof bookmarkEditSchema>} BookmarkEdit
 * @typedef {FromSchema<typeof mutationReceiptSchema>} MutationReceipt
 */

const id = /** @type {const} */ ({ type: 'string', format: 'uuid' })
const flag = bookmarkProps.properties.starred
const title = /** @type {const} */ ({ ...bookmarkProps.properties.title, nullable: true, pattern: '^[^\\u0000]*$' })
const text = /** @type {const} */ ({ type: 'string', nullable: true, pattern: '^[^\\u0000]*$' })

/** @template {JSONSchema} T @param {T} value */
function intent (value) {
  return /** @type {const} */ ({
    type: 'object',
    additionalProperties: false,
    required: ['base', 'value'],
    properties: { base: value, value },
  })
}

export const bookmarkEditSchema = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  additionalProperties: false,
  required: ['kind', 'operation_id', 'bookmark_id'],
  anyOf: [{ required: ['fields'] }, { required: ['tags'] }],
  properties: {
    kind: { const: 'bookmark_edit' },
    operation_id: { ...id, description: 'Stable client operation ID. Reuse it only to retry the same request.' },
    bookmark_id: id,
    fields: {
      type: 'object',
      additionalProperties: false,
      minProperties: 1,
      properties: {
        title: intent(title),
        note: intent(text),
        summary: intent(text),
        starred: intent(flag),
        toread: intent(flag),
        sensitive: intent(flag),
      },
    },
    tags: {
      type: 'array',
      description: 'Desired case-insensitive tag memberships. Each tag may appear once.',
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
})

const disposition = /** @type {const} */ ({ enum: ['applied', 'already_applied', 'conflict'] })

export const mutationReceiptSchema = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  additionalProperties: false,
  required: ['operation_id', 'bookmark_id', 'outcome', 'fields', 'tags'],
  properties: {
    operation_id: id,
    bookmark_id: id,
    outcome: { enum: ['processed', 'bookmark_missing'] },
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
