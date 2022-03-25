import fp from 'fastify-plugin'
import path from 'path'
import desm from 'desm'

const __dirname = desm(import.meta.url)

/**
 * This plugins adds fastify-static
 *
 * @see https://github.com/fastify/fastify-static
 */
export default fp(async function (fastify, opts) {
  fastify.register(import('fastify-static'), {
    root: path.join(__dirname, '../public'),
    prefix: '/'
  })
}, {
  name: 'static',
  dependencies: ['env']
})
