import fp from 'fastify-plugin'

export const schema = {
  type: 'object',
  required: [
    'JWT_SECRET',
    'COOKIE_SECRET'
  ],
  properties: {
    ENV: {
      type: 'string',
      default: 'development'
    },
    METRICS: {
      type: 'boolean',
      default: true
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
      type: 'string',
      // breadcrum.net in production
      default: 'localhost'
    },
    REGISTRATION: {
      type: 'boolean',
      default: true
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
