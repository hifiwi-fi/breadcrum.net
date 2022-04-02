import fp from 'fastify-plugin'

const schema = {
  type: 'object',
  required: [],
  properties: {
    ENV: {
      type: 'string',
      default: 'development'
    },
    JWT_SECRET: {
      type: 'string',
      // THIS IS JUST A DEV SECRET
      // TODO: move these to .env file for dev, throw when missing
      default: 'c24deaadfd768e04e833227b494d10d49a7fec4a5c6330ead080f2ffc051d33c'
    },
    COOKIE_SECRET: {
      type: 'string',
      // THIS IS JUST A DEV SECRET
      // // TODO: move these to .env file for dev, throw when missing
      default: '08b7ee661730c8a0c8638f260a6b5e7dda40155dc27a416ad87470ad813250f9'
    },
    COOKIE_NAME: {
      type: 'string',
      default: 'breadcrum_token'
    },
    APP_NAME: {
      type: 'string',
      default: 'breadcrum'
    },
    DATABASE_URL: {
      type: 'string',
      default: 'postgres://postgres@localhost/breadcrum'
    },
    DOMAIN: {
      type: 'string',
      default: 'localhost'
    },
    REGISTRATION: {
      type: 'string',
      default: 'enabled'
    }
  }
}

/**
 * This plugins adds config
 *
 * @see https://github.com/fastify/fastify-env
 */
export default fp(async function (fastify, opts) {
  fastify.register(import('fastify-env'), {
    schema: schema,
    dotenv: true
  })
}, {
  name: 'env'
})
