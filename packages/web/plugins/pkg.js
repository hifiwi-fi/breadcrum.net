import fp from 'fastify-plugin'
import { readFile } from 'fs/promises'
import { join } from 'path'

/**
 * Decorates the Fastify instance with package information.
 */
export default fp(async function (fastify, _opts) {
  const __dirname = import.meta.dirname
  const pkg = JSON.parse(await readFile(join(__dirname, '../package.json'), 'utf8'))

  fastify.decorate('pkg', pkg)
}, {
  name: 'pkg',
})
