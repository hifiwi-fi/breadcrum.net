/**
 * @import { FromSchema, JSONSchema } from 'json-schema-to-ts'
 * @import { Role } from './role.js'
 * @typedef {FromSchema<typeof envSchema>} ApiConfig
 * @typedef {Omit<ApiConfig, 'COOKIE_SECRET' | 'JWT_SECRET'> & Partial<Pick<ApiConfig, 'COOKIE_SECRET' | 'JWT_SECRET'>>} RuntimeConfig
 */
import { mergeEnvSchemas } from './merge-env-schemas.js'
import { authEnvSchema } from '#plugins/api/auth.env-schema.js'
import { cookieEnvSchema } from '#plugins/api/cookie.env-schema.js'
import { emailEnvSchema } from '#plugins/api/email.env-schema.js'
import { geoipEnvSchema } from '#plugins/api/geoip.env-schema.js'
import { helmetEnvSchema } from '#plugins/api/helmet.env-schema.js'
import { jwtEnvSchema } from '#plugins/api/jwt.env-schema.js'
import { rateLimitEnvSchema } from '#plugins/api/rate-limit.env-schema.js'
import { swaggerEnvSchema } from '#plugins/api/swagger.env-schema.js'
import { ytDlpEnvSchema } from '#plugins/api/yt-dlp.env-schema.js'
import { otelMetricsEnvSchema } from '#plugins/shared/otel-metrics.env-schema.js'
import { pgEnvSchema } from '#plugins/shared/pg.env-schema.js'
import { redisEnvSchema } from '#plugins/shared/redis.env-schema.js'
import { sentryEnvSchema } from '#plugins/shared/sentry.env-schema.js'
import { pgbossEnvSchema } from '#plugins/worker/pgboss.env-schema.js'
import { roleDefaults } from './role.js'

const common = mergeEnvSchemas(/** @type {const} */ ([
  pgEnvSchema,
  redisEnvSchema,
  otelMetricsEnvSchema,
  sentryEnvSchema,
  ytDlpEnvSchema,
  pgbossEnvSchema,
]))
const api = mergeEnvSchemas(/** @type {const} */ ([
  authEnvSchema,
  cookieEnvSchema,
  emailEnvSchema,
  geoipEnvSchema,
  helmetEnvSchema,
  jwtEnvSchema,
  rateLimitEnvSchema,
  swaggerEnvSchema,
]))

export const envSchema = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  $id: 'schema:dotenv',
  additionalProperties: false,
  required: ['APP_ROLE', ...common.required, ...api.required],
  properties: {
    APP_ROLE: { type: 'string', enum: ['api', 'worker', 'all'] },
    ENV: { type: 'string', default: 'development' },
    FASTIFY_LOG_LEVEL: { type: 'string', enum: ['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent'], default: 'info' },
    HOST: { type: 'string', default: 'localhost:3000' },
    TRANSPORT: { enum: ['http', 'https'], default: 'http' },
    LISTEN_HOST: { type: 'string', default: '0.0.0.0' },
    PORT: { type: 'integer', minimum: 0, maximum: 65535, default: 3000 },
    METRICS: { type: 'integer', enum: [0, 1], default: 1 },
    METRICS_PORT: { type: 'integer', minimum: 1, maximum: 65535, default: 9091 },
    SHUTDOWN_TIMEOUT_MS: { type: 'integer', minimum: 1000, default: 45000 },
    JOB_DRAIN_TIMEOUT_MS: { type: 'integer', minimum: 1000, default: 30000 },
    SENTRY_ENVIRONMENT: { type: 'string' },
    ...common.properties,
    ...api.properties,
  },
})

/** @param {Role} role */
export function schemaForRole (role) {
  const defaults = roleDefaults(role)
  return {
    ...envSchema,
    required: role === 'worker' ? ['APP_ROLE', ...common.required] : envSchema.required,
    properties: {
      ...envSchema.properties,
      OTEL_SERVICE_NAME: { ...envSchema.properties.OTEL_SERVICE_NAME, default: defaults.OTEL_SERVICE_NAME },
    },
  }
}
