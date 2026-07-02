/**
 * @import { FromSchema, JSONSchema } from "json-schema-to-ts"
 * @import { EnvSchemaFragment } from '@breadcrum/resources/fastify-common/env-schema.js'
 * @typedef { typeof envSchema } EnvSchemaType
 * @typedef { FromSchema<EnvSchemaType> } DotEnvSchemaType
 */

import { mergeEnvSchemas } from '@breadcrum/resources/fastify-common/env-schema.js'
import { billingEnvSchema } from '#plugins/billing.js'
import { otelMetricsEnvSchema } from '#plugins/otel-metrics.js'
import { pgEnvSchema } from '#plugins/pg.js'
import { pgbossEnvSchema } from '#plugins/pgboss.js'
import { redisEnvSchema } from '#plugins/redis.js'
import { sentryEnvSchema } from '#plugins/sentry.js'

const pluginEnvSchemas = /** @type {const} @satisfies {readonly EnvSchemaFragment[]} */ ([
  billingEnvSchema,
  otelMetricsEnvSchema,
  pgEnvSchema,
  pgbossEnvSchema,
  redisEnvSchema,
  sentryEnvSchema,
])

const pluginEnvSchema = mergeEnvSchemas(pluginEnvSchemas)

export const envSchema = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  $id: 'schema:dotenv',
  additionalProperties: false,
  required: pluginEnvSchema.required,
  properties: {
    // Base / cross-cutting
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

    // Worker-level (no plugin home)
    YT_DLP_API_URL: {
      type: 'string',
      default: 'http://user:pass@127.0.0.1:3010',
    },
    AUTH_TOKEN_RETENTION_DAYS: {
      type: 'integer',
      default: 365,
    },

    // Plugin schemas
    ...pluginEnvSchema.properties,
  },
})
