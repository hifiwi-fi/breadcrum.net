import fp from 'fastify-plugin'

export const schema = {
  type: 'object',
  required: [
    'JWT_SECRET',
    'COOKIE_SECRET',
    'REGISTRATION' // Due to build time client use
  ],
  properties: {
    ENV: {
      type: 'string',
      default: 'development'
    },
    METRICS: {
      enum: [0, 1],
      default: 1
    },
    JWT_SECRET: {
      type: 'string'
    },
    COOKIE_SECRET: {
      type: 'string'
    },
    COOKIE_NAME: {
      type: 'string',
      default: 'breadcrum_token'
    },
    DATABASE_URL: {
      type: 'string',
      default: 'postgres://postgres@localhost/breadcrum'
    },
    DOMAIN: {
      // Hostname and port (if needed)
      type: 'string',
      default: 'localhost:3000'
    },
    REGISTRATION: {
      enum: [0, 1]
    },
    TRANSPORT: {
      enum: ['http', 'https'],
      default: 'http'
    }
  }
}

/**
 * This plugins adds config
 *
 * @see https://github.com/fastify/fastify-env
 */
export default fp(async function (fastify, opts) {
  fastify.register(import('@fastify/env'), {
    schema,
    dotenv: true
  })
}, {
  name: 'env'
})
