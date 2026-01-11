/**
 * @import { FromSchema, JSONSchema } from "json-schema-to-ts"
 * @typedef { typeof envSchema } EnvSchemaType
 * @typedef { FromSchema<EnvSchemaType> } DotEnvSchemaType
 */

export const envSchema = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  $id: 'schema:dotenv',
  required: [
    'JWT_SECRET',
    'COOKIE_SECRET',
    'TURNSTILE_SECRET_KEY',
  ],
  additionalProperties: false,
  properties: {
    ENV: {
      type: 'string',
      default: 'development',
    },
    JWT_SECRET: {
      type: 'string',
    },
    COOKIE_SECRET: {
      type: 'string',
    },
    COOKIE_NAME: {
      type: 'string',
      default: 'breadcrum_token',
    },
    DATABASE_URL: {
      type: 'string',
      default: 'postgres://postgres@localhost/breadcrum',
    },
    REDIS_CACHE_URL: {
      type: 'string',
      default: 'redis://localhost:6379/1',
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
    SECURE_IFRAMES: {
      type: 'boolean',
      default: false,
    },
    SMTP_HOST: {
      type: 'string',
    },
    SMTP_PORT: {
      type: 'integer',
      default: 465,
    },
    SMTP_SECURE: {
      type: 'boolean',
      default: true,
    },
    SMTP_USER: {
      type: 'string',
    },
    SMTP_PASS: {
      type: 'string',
    },
    APP_EMAIL: {
      type: 'string',
      default: 'support@breadcrum.net',
    },
    SNS_USER: {
      type: 'string',
      default: 'sns-user',
    },
    SNS_PASS: {
      type: 'string',
    },
    YT_DLP_API_URL: {
      type: 'string',
      default: 'http://user:pass@127.0.0.1:5000',
    },
    SWAGGER: {
      type: 'boolean',
      default: true,
    },
    OTEL_SERVICE_NAME: {
      type: 'string',
      default: 'breadcrum-web',
    },
    OTEL_SERVICE_VERSION: {
      type: 'string',
      default: '1.0.0',
    },
    OTEL_RESOURCE_ATTRIBUTES: {
      type: 'string',
      default: 'deployment.environment=development',
    },
    EMAIL_SENDING: {
      type: 'boolean',
      default: true,
    },
    EMAIL_VALIDATION: {
      type: 'boolean',
      default: true,
    },
    RATE_LIMITING: {
      type: 'boolean',
      default: true,
    },
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
  },
})
