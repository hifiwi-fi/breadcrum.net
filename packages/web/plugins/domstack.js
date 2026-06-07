import fp from 'fastify-plugin'
import path from 'node:path'

const __dirname = import.meta.dirname

export default fp(async function domstackPlugin (fastify) {
  await fastify.register(import('@domstack/fastify'), {
    src: path.join(__dirname, '../routes'),
    dest: path.join(__dirname, '../public'),
    build: 'if-missing',
    watch: false,
    autoHooks: true,
    cascadeHooks: true,
    overwriteHooks: true,
    ignore: [
      'api',
      '**/*.test.js',
      '**/*.schema.js',
    ],
  })
}, {
  name: 'domstack',
  dependencies: ['env', 'fragtml'],
})
