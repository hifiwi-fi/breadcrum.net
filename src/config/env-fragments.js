/** @import { JSONSchema } from "json-schema-to-ts" */

// Data only: this module must not import application or instrumented libraries.

export const authEnvSchema = /** @type {const} @satisfies {JSONSchema} */ ({
  properties: {
    TURNSTILE_VALIDATE: {
      // TODO: Replace with a bypass token to allow tests against staging/prod.
      type: 'boolean',
      default: true,
    },
    TURNSTILE_SITEKEY: {
      type: 'string',
      default: '1x00000000000000000000AA',
    },
    TURNSTILE_SECRET_KEY: {
      type: 'string',
      default: '1x0000000000000000000000000000000AA',
    },
    PASSKEY_MAX_PER_USER: {
      type: 'integer',
      default: 10,
      minimum: 1,
      maximum: 100,
      description: 'Maximum number of passkeys allowed per user',
    },
    PASSKEY_CHALLENGE_TIMEOUT: {
      type: 'integer',
      default: 300000,
      description: 'Passkey challenge timeout in milliseconds (default: 5 minutes)',
    },
  },
  required: ['TURNSTILE_SECRET_KEY'],
})

export const cookieEnvSchema = /** @type {const} @satisfies {JSONSchema} */ ({
  properties: {
    COOKIE_SECRET: { type: 'string' },
    COOKIE_NAME: { type: 'string', default: 'breadcrum_token' },
  },
  required: ['COOKIE_SECRET'],
})

export const emailEnvSchema = /** @type {const} @satisfies {JSONSchema} */ ({
  properties: {
    EMAIL_SENDING: { type: 'boolean', default: true },
    EMAIL_VALIDATION: { type: 'boolean', default: true },
    SMTP_HOST: { type: 'string' },
    SMTP_PORT: { type: 'integer', default: 465 },
    SMTP_SECURE: { type: 'boolean', default: true },
    SMTP_USER: { type: 'string' },
    SMTP_PASS: { type: 'string' },
    APP_EMAIL: { type: 'string', default: 'support@breadcrum.net' },
    SNS_USER: { type: 'string', default: 'sns-user' },
    SNS_PASS: { type: 'string' },
  },
  required: [],
})

export const geoipEnvSchema = /** @type {const} @satisfies {JSONSchema} */ ({
  properties: {
    MAXMIND_ACCOUNT_ID: { type: 'string' },
    MAXMIND_LICENSE_KEY: { type: 'string' },
  },
  required: [],
})

export const helmetEnvSchema = /** @type {const} @satisfies {JSONSchema} */ ({
  properties: {
    SECURE_IFRAMES: { type: 'boolean', default: false },
  },
  required: [],
})

export const jwtEnvSchema = /** @type {const} @satisfies {JSONSchema} */ ({
  properties: {
    JWT_SECRET: { type: 'string' },
  },
  required: ['JWT_SECRET'],
})

export const otelMetricsEnvSchema = /** @type {const} @satisfies {JSONSchema} */ ({
  properties: {
    OTEL_SERVICE_NAME: { type: 'string', default: 'breadcrum-web' },
    OTEL_SERVICE_VERSION: { type: 'string', default: '1.0.0' },
    OTEL_RESOURCE_ATTRIBUTES: { type: 'string', default: 'deployment.environment=development' },
  },
  required: [],
})

export const pgEnvSchema = /** @type {const} @satisfies {JSONSchema} */ ({
  properties: {
    DATABASE_URL: { type: 'string', default: 'postgres://postgres@localhost/breadcrum' },
    // pg default: 0, disabled; fail fast when PgBouncer cannot be reached
    PG_CONNECTION_TIMEOUT_MS: { type: 'integer', default: 5000 },
    // pg default: 0; only used because keepAlive is enabled below
    PG_KEEP_ALIVE_INITIAL_DELAY_MS: { type: 'integer', default: 10000 },
  },
  required: [],
})

export const rateLimitEnvSchema = /** @type {const} @satisfies {JSONSchema} */ ({
  properties: {
    RATE_LIMITING: { type: 'boolean', default: true },
  },
  required: [],
})

export const redisEnvSchema = /** @type {const} @satisfies {JSONSchema} */ ({
  properties: {
    REDIS_CACHE_URL: { type: 'string', default: 'redis://localhost:6379/1' },
  },
  required: [],
})

export const sentryEnvSchema = /** @type {const} @satisfies {JSONSchema} */ ({
  properties: {
    SENTRY_DSN: { type: 'string' },
    SENTRY_API_DSN: { type: 'string' },
    SENTRY_WORKER_DSN: { type: 'string' },
    SENTRY_BROWSER_DSN: { type: 'string' },
    SENTRY_RELEASE: { type: 'string' },
  },
  required: [],
})

export const swaggerEnvSchema = /** @type {const} @satisfies {JSONSchema} */ ({
  properties: {
    SWAGGER: { type: 'boolean', default: true },
  },
  required: [],
})

export const ytDlpEnvSchema = /** @type {const} @satisfies {JSONSchema} */ ({
  properties: {
    YT_DLP_API_URL: { type: 'string', default: 'http://user:pass@127.0.0.1:3010' },
  },
  required: [],
})
