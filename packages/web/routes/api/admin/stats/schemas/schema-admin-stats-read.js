import { fullSerializedUserProps, userEditableUserProps } from '../../../user/schemas/user-base.js'

/**
 * @import { JSONSchema, FromSchema } from 'json-schema-to-ts'
 * @typedef {typeof schemaAdminStatsRead} SchemaAdminStatsRead
 * @typedef {FromSchema<SchemaAdminStatsRead>} TypeAdminStatsReadClient
 */

const countValueProps = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'string',
  description: 'Postgres count values are serialized as strings.',
})

const bookmarkStatProps = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  additionalProperties: false,
  required: ['id', 'username', 'email', 'bookmark_count'],
  properties: {
    id: fullSerializedUserProps.properties.id,
    username: userEditableUserProps.properties.username,
    email: userEditableUserProps.properties.email,
    bookmark_count: countValueProps,
  },
})

const totalUsersProps = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  additionalProperties: false,
  required: ['users_count'],
  properties: {
    users_count: countValueProps,
  },
})

const totalBookmarksProps = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  additionalProperties: false,
  required: ['bookmark_count'],
  properties: {
    bookmark_count: countValueProps,
  },
})

const cumulativeCountRowProps = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  required: ['label'],
  properties: {
    label: {
      type: 'string',
      description: 'Label for the cumulative count group.',
    },
  },
  additionalProperties: countValueProps,
})

export const schemaAdminStatsRead = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  $id: 'schema:breadcrum:admin-stats:read',
  additionalProperties: false,
  required: ['bookmarkStats', 'totalUsers', 'totalBookmarks', 'cumulativeCounts'],
  properties: {
    bookmarkStats: {
      type: 'array',
      items: bookmarkStatProps,
    },
    totalUsers: {
      type: 'array',
      items: totalUsersProps,
    },
    totalBookmarks: {
      type: 'array',
      items: totalBookmarksProps,
    },
    cumulativeCounts: {
      type: 'array',
      items: cumulativeCountRowProps,
    },
  },
})
