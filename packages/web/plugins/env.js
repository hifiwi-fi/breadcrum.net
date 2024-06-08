import fp from 'fastify-plugin'
import { readFile } from 'fs/promises'
import { join, resolve } from 'path'

/**
 * @import { FromSchema, JSONSchema } from "json-schema-to-ts"
 * @typedef { FromSchema<typeof schema> } SchemaType
 */

export const schema = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  required: [
    'JWT_SECRET',
    'COOKIE_SECRET',
  ],
  properties: {
    ENV: {
      type: 'string',
      default: 'development',
    },
    METRICS: {
      type: 'integer', // 0 or 1
      default: 1,
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
    REDIS_QUEUE_URL: {
      type: 'string',
      default: 'redis://localhost:6379/2',
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
  },
})

/**
 * This plugins adds config
 *
 * @see https://github.com/fastify/fastify-env
 */
export default fp(async function (fastify, _) {
  fastify.register(import('@fastify/env'), {
    schema,
    dotenv: {
      path: resolve(import.meta.dirname, '../.env'),
      debug: false,
    },
  })

  const __dirname = import.meta.dirname
  const pkg = JSON.parse(await readFile(join(__dirname, '../package.json'), 'utf8'))

  fastify.decorate('pkg', pkg)
}, {
  name: 'env',
})
