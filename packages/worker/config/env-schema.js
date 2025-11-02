/**
 * @import { FromSchema, JSONSchema } from "json-schema-to-ts"
 * @typedef { typeof envSchema } EnvSchemaType
 * @typedef { FromSchema<EnvSchemaType> } DotEnvSchemaType
 */

export const envSchema = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  $id: 'schema:dotenv',
  required: [],
  additionalProperties: false,
  properties: {
    ENV: {
      type: 'string',
      default: 'development',
    },
    METRICS: {
      type: 'integer', // 0 or 1
      default: 1,
    },
    HOST: {
      // Hostname and port (if needed)
      type: 'string',
      default: 'localhost:3001',
    },
    TRANSPORT: {
      enum: ['http', 'https'],
      default: 'http',
    },
    DATABASE_URL: {
      type: 'string',
      default: 'postgres://postgres@localhost/breadcrum',
    },
    REDIS_CACHE_URL: {
      type: 'string',
      default: 'redis://localhost:6379/1',
    },
    YT_DLP_API_URL: {
      type: 'string',
      default: 'http://user:pass@127.0.0.1:5000',
    },
    OTEL_SERVICE_NAME: {
      type: 'string',
      default: 'breadcrum-worker',
    },
    OTEL_SERVICE_VERSION: {
      type: 'string',
      default: '1.0.0',
    },
    OTEL_RESOURCE_ATTRIBUTES: {
      type: 'string',
      default: 'deployment.environment=development',
    },
    EPISODE_WORKER_CONCURRENCY: {
      type: 'integer',
      default: 2,
    },
    ARCHIVE_WORKER_CONCURRENCY: {
      type: 'integer',
      default: 2,
    },
    BOOKMARK_WORKER_CONCURRENCY: {
      type: 'integer',
      default: 2,
    },
    AUTH_TOKEN_RETENTION_DAYS: {
      type: 'integer',
      default: 365,
    },
  },
})
