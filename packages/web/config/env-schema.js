/**
 * @import { FromSchema, JSONSchema } from "json-schema-to-ts"
 * @import { EnvSchemaFragment } from '@breadcrum/resources/fastify-common/env-schema.js'
 * @typedef { typeof envSchema } EnvSchemaType
 * @typedef { FromSchema<EnvSchemaType> } DotEnvSchemaType
 */

import { mergeEnvSchemas } from '@breadcrum/resources/fastify-common/env-schema.js'
import { authEnvSchema } from '#plugins/auth.js'
import { cookieEnvSchema } from '#plugins/cookie.js'
import { emailEnvSchema } from '#plugins/email.js'
import { geoipEnvSchema } from '#plugins/geoip.js'
import { helmetEnvSchema } from '#plugins/helmet.js'
import { jwtEnvSchema } from '#plugins/jwt.js'
import { otelMetricsEnvSchema } from '#plugins/otel-metrics.js'
import { pgEnvSchema } from '#plugins/pg.js'
import { rateLimitEnvSchema } from '#plugins/rate-limit.js'
import { redisEnvSchema } from '#plugins/redis.js'
import { sentryEnvSchema } from '#plugins/sentry.js'
import { swaggerEnvSchema } from '#plugins/swagger.js'
import { ytDlpEnvSchema } from '#plugins/yt-dlp.js'

const pluginEnvSchemas = /** @type {const} @satisfies {readonly EnvSchemaFragment[]} */ ([
  authEnvSchema,
  cookieEnvSchema,
  emailEnvSchema,
  geoipEnvSchema,
  helmetEnvSchema,
  jwtEnvSchema,
  otelMetricsEnvSchema,
  pgEnvSchema,
  rateLimitEnvSchema,
  redisEnvSchema,
  sentryEnvSchema,
  swaggerEnvSchema,
  ytDlpEnvSchema,
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
    HOST: {
      // Hostname and port (if needed)
      type: 'string',
      default: 'localhost:3000',
    },
    TRANSPORT: {
      enum: ['http', 'https'],
      default: 'http',
    },

    // Plugin schemas
    ...pluginEnvSchema.properties,
  },
})
