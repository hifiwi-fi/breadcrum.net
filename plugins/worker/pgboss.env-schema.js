/** @import { JSONSchema } from 'json-schema-to-ts' */

export const pgbossEnvSchema = /** @type {const} @satisfies {JSONSchema} */ ({
  properties: {
    EPISODE_WORKER_CONCURRENCY: { type: 'integer', minimum: 1, default: 2 },
    ARCHIVE_WORKER_CONCURRENCY: { type: 'integer', minimum: 1, default: 2 },
    BOOKMARK_WORKER_CONCURRENCY: { type: 'integer', minimum: 1, default: 2 },
    AUTH_TOKEN_RETENTION_DAYS: { type: 'integer', minimum: 1, default: 365 },
  },
  required: [],
})
