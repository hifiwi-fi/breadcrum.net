/**
 * @import { FromSchema, JSONSchema } from "json-schema-to-ts"
 * @typedef { typeof envSchema } EnvSchemaType
 * @typedef { FromSchema<EnvSchemaType> } DotEnvSchemaType
 */

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

export const envSchema = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  $id: 'schema:dotenv',
  additionalProperties: false,
  required: [
    ...authEnvSchema.required,
    ...cookieEnvSchema.required,
    ...emailEnvSchema.required,
    ...geoipEnvSchema.required,
    ...helmetEnvSchema.required,
    ...jwtEnvSchema.required,
    ...otelMetricsEnvSchema.required,
    ...pgEnvSchema.required,
    ...rateLimitEnvSchema.required,
    ...redisEnvSchema.required,
    ...sentryEnvSchema.required,
    ...swaggerEnvSchema.required,
    ...ytDlpEnvSchema.required,
  ],
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
    ...authEnvSchema.properties,
    ...cookieEnvSchema.properties,
    ...emailEnvSchema.properties,
    ...geoipEnvSchema.properties,
    ...helmetEnvSchema.properties,
    ...jwtEnvSchema.properties,
    ...otelMetricsEnvSchema.properties,
    ...pgEnvSchema.properties,
    ...rateLimitEnvSchema.properties,
    ...redisEnvSchema.properties,
    ...sentryEnvSchema.properties,
    ...swaggerEnvSchema.properties,
    ...ytDlpEnvSchema.properties,
  },
})
