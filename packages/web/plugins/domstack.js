import fp from 'fastify-plugin'
import path from 'path'

const __dirname = import.meta.dirname

export default fp(async function (fastify, _) {
  fastify.register(import('@domstack/fastify'), {
    src: path.join(__dirname, '../routes/client'),
    dest: path.join(__dirname, '../public'),
    watch: fastify.config.ENV !== 'production',
  })
}, {
  name: 'domstack',
  dependencies: ['env'],
})
