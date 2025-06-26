import fp from 'fastify-plugin'
import { readFile } from 'fs/promises'
import { join, resolve } from 'path'

/**
 * @import { FromSchema, JSONSchema } from "json-schema-to-ts"
 * @typedef { FromSchema<typeof schema> } SchemaType
 */

export const schema = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  required: [],
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
  },
})

/**
 * This plugins adds config
 *
 * @see https://github.com/fastify/fastify-env
 */
export default fp(async function (fastify, _opts) {
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
