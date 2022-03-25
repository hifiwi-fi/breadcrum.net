import fp from 'fastify-plugin'

const schema = {
  type: 'object',
  required: [],
  properties: {
    ENV: {
      type: 'string',
      default: 'development'
    },
    COOKIE_SECRET: {
      type: 'string',
      // THIS IS JUST A DEV SECRET
      default: '08b7ee661730c8a0c8638f260a6b5e7dda40155dc27a416ad87470ad813250f9'
    },
    APP_NAME: {
      type: 'string',
      default: 'breadcrum'
    },
    PG_CONNECTION_STRING: {
      type: 'string',
      default: 'postgres://postgres@localhost/breadcrum'
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
