/** @import { JSONSchema } from 'json-schema-to-ts' */

// Data only: this module must not import application or instrumented libraries.

export const redisEnvSchema = /** @type {const} @satisfies {JSONSchema} */ ({
  properties: {
    REDIS_CACHE_URL: { type: 'string', default: 'redis://localhost:6379/1' },
  },
  required: [],
})
