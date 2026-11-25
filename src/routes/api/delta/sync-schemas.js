/**
 * @import { FromSchema, JSONSchema } from 'json-schema-to-ts'
 * @typedef {FromSchema<typeof syncBookmarkSchema>} SyncBookmark
 * @typedef {FromSchema<typeof bootstrapSchema>} SyncBootstrap
 * @typedef {FromSchema<typeof changesSchema>} SyncChanges
 */

const id = /** @type {const} */ ({ type: 'string', format: 'uuid' })
const date = /** @type {const} */ ({ type: 'string', format: 'date-time' })
const nullableDate = /** @type {const} */ ({ ...date, nullable: true })
const nullableText = /** @type {const} */ ({ type: 'string', nullable: true })
const bool = /** @type {const} */ ({ type: 'boolean' })
const uri = /** @type {const} */ ({ type: 'string', format: 'uri' })
const cursor = /** @type {const} */ ({ type: 'string', minLength: 1, maxLength: 512 })
const perPage = /** @type {const} */ ({ type: 'integer', minimum: 1, maximum: 200, default: 20 })

const archive = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  additionalProperties: false,
  required: ['id', 'url', 'title', 'site_name', 'excerpt', 'byline', 'created_at', 'updated_at', 'published_time', 'extraction_method', 'ready', 'done'],
  properties: {
    id,
    url: uri,
    title: nullableText,
    site_name: nullableText,
    excerpt: nullableText,
    byline: nullableText,
    created_at: date,
    updated_at: nullableDate,
    published_time: nullableDate,
    extraction_method: { enum: ['server', 'client'] },
    ready: bool,
    done: bool,
  },
})

const episode = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  additionalProperties: false,
  required: ['id', 'display_title', 'created_at', 'updated_at', 'published_time', 'medium', 'author_name', 'ready', 'done'],
  properties: {
    id,
    display_title: { type: 'string' },
    created_at: date,
    updated_at: nullableDate,
    published_time: nullableDate,
    medium: { enum: ['audio', 'video'] },
    author_name: nullableText,
    ready: bool,
    done: bool,
  },
})

const syncBookmarkSchema = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  additionalProperties: false,
  required: [
    'id', 'url', 'title', 'note', 'summary', 'created_at', 'updated_at',
    'sensitive', 'starred', 'toread', 'done', 'archive_urls', 'tags', 'archives', 'episodes',
  ],
  properties: {
    id,
    url: uri,
    title: nullableText,
    note: nullableText,
    summary: nullableText,
    created_at: date,
    updated_at: nullableDate,
    sensitive: bool,
    starred: bool,
    toread: bool,
    done: bool,
    archive_urls: { type: 'array', items: uri },
    tags: { type: 'array', items: { type: 'string' } },
    archives: { type: 'array', items: archive },
    episodes: { type: 'array', items: episode },
  },
})

export const bootstrapQuery = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  additionalProperties: false,
  properties: { page_token: cursor, per_page: perPage },
})

export const changesQuery = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  additionalProperties: false,
  required: ['cursor'],
  properties: { cursor, per_page: perPage },
})

export const bootstrapSchema = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  additionalProperties: false,
  required: ['bookmarks', 'cursor', 'next_page_token'],
  properties: {
    bookmarks: { type: 'array', items: syncBookmarkSchema },
    cursor,
    next_page_token: { ...cursor, nullable: true },
  },
})

export const changesSchema = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  additionalProperties: false,
  required: ['changes', 'next_cursor', 'has_more'],
  properties: {
    changes: {
      type: 'array',
      items: {
        anyOf: [
          {
            type: 'object',
            additionalProperties: false,
            required: ['op', 'bookmark'],
            properties: { op: { const: 'upsert' }, bookmark: syncBookmarkSchema },
          },
          {
            type: 'object',
            additionalProperties: false,
            required: ['op', 'bookmark_id'],
            properties: { op: { const: 'delete' }, bookmark_id: id },
          },
        ],
      },
    },
    next_cursor: cursor,
    has_more: bool,
  },
})

export const cursorErrorSchema = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  additionalProperties: false,
  required: ['code', 'message'],
  properties: {
    code: { enum: ['invalid_sync_cursor', 'sync_reset_required'] },
    message: { type: 'string' },
  },
})
