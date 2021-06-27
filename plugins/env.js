import fp from 'fastify-plugin'

const schema = {
  type: 'object',
  required: [ ],
  properties: {
    FOO: {
      type: 'string',
      default: 'bar'
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
})
