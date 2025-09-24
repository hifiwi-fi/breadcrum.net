import fp from 'fastify-plugin'
import path from 'path'

const __dirname = import.meta.dirname

/**
 * This plugins adds fastify-static
 *
 * @see https://github.com/fastify/fastify-static
 */
export default fp(async function (fastify, _) {
  const staticOpts = {
    redirect: true,
    maxAge: fastify.config.ENV === 'production' ? 600000 : 0,
    lastModified: true,
  }

  fastify.register(import('@fastify/static'), {
    logLevel: 'silent',
    root: path.join(__dirname, '../public'),
    prefix: '/',
    ...staticOpts,
  })

  // Admin Routes auth protection
  fastify.register(async function (fastify, _) {
    fastify.addHook('preHandler', fastify.auth([
      fastify.verifyJWT,
      fastify.verifyAdmin,
    ], {
      relation: 'and',
    }))
    fastify.register(import('@fastify/static'), {
      logLevel: 'silent',
      root: path.join(__dirname, '../public/admin'),
      prefix: '/',
      ...staticOpts,
    })
  }, { prefix: '/admin' })
}, {
  name: 'static',
  dependencies: ['compress', 'auth', 'jwt', 'helmet'],
})
