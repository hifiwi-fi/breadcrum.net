/**
 * @import { FromSchema, JSONSchema } from 'json-schema-to-ts'
 * @import { Role } from './role.js'
 * @typedef {FromSchema<typeof envSchema>} ApiConfig
 * @typedef {Omit<ApiConfig, 'COOKIE_SECRET' | 'JWT_SECRET'> & Partial<Pick<ApiConfig, 'COOKIE_SECRET' | 'JWT_SECRET'>>} RuntimeConfig
 */
import { mergeEnvSchemas } from '#resources/fastify-common/env-schema.js'
import * as fragments from './env-fragments.js'
import { roleDefaults } from './role.js'

export const pgbossEnvSchema = /** @type {const} @satisfies {JSONSchema} */ ({
  properties: {
    EPISODE_WORKER_CONCURRENCY: { type: 'integer', minimum: 1, default: 2 },
    ARCHIVE_WORKER_CONCURRENCY: { type: 'integer', minimum: 1, default: 2 },
    BOOKMARK_WORKER_CONCURRENCY: { type: 'integer', minimum: 1, default: 2 },
    AUTH_TOKEN_RETENTION_DAYS: { type: 'integer', minimum: 1, default: 365 },
  },
  required: [],
})

const common = mergeEnvSchemas(/** @type {const} */ ([
  fragments.pgEnvSchema,
  fragments.redisEnvSchema,
  fragments.otelMetricsEnvSchema,
  fragments.sentryEnvSchema,
  fragments.ytDlpEnvSchema,
  pgbossEnvSchema,
]))
const api = mergeEnvSchemas(/** @type {const} */ ([
  fragments.authEnvSchema,
  fragments.cookieEnvSchema,
  fragments.emailEnvSchema,
  fragments.geoipEnvSchema,
  fragments.helmetEnvSchema,
  fragments.jwtEnvSchema,
  fragments.rateLimitEnvSchema,
  fragments.swaggerEnvSchema,
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
      METRICS_PORT: { ...envSchema.properties.METRICS_PORT, default: defaults.METRICS_PORT },
    },
  }
}
