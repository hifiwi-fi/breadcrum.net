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
  const staticOpts = {
    redirect: true,
    maxAge: fastify.config.ENV === 'production' ? 600000 : 0,
    lastModified: true
  }

  fastify.register(import('@fastify/static'), {
    root: path.join(__dirname, '../public'),
    prefix: '/',
    ...staticOpts
  })

  // Admin Routes auth protection
  fastify.register(async function (fastify, opts) {
    fastify.addHook('preHandler', fastify.auth([
      fastify.verifyJWT,
      fastify.verifyAdmin
    ], {
      relation: 'and'
    }))
    fastify.register(import('@fastify/static'), {
      root: path.join(__dirname, '../public/admin'),
      prefix: '/',
      ...staticOpts
    })
  }, { prefix: '/admin' })

  // Feed Routes modified CSP
  const upgradeInsecureRequests = fastify.config.ENV !== 'production' ? null : []

  const episodesHeaders = {
    contentSecurityPolicy: {
      directives: {
        'media-src': '*',
        'upgrade-insecure-requests': upgradeInsecureRequests
      }
    }
  }
  fastify.register(async function (fastify, opts) {
    fastify.register(import('@fastify/helmet'), episodesHeaders)
    fastify.register(import('@fastify/static'), {
      root: path.join(__dirname, '../public/feeds'),
      prefix: '/',
      ...staticOpts
    })
  }, { prefix: '/feeds' })
  // Episodes routes
  fastify.register(async function (fastify, opts) {
    fastify.register(import('@fastify/helmet'), episodesHeaders)
    fastify.register(import('@fastify/static'), {
      root: path.join(__dirname, '../public/episodes'),
      prefix: '/',
      ...staticOpts
    })
  }, { prefix: '/episodes' })

  // Archives Routes Modified CSP, COEP, CORP
  fastify.register(async function (fastify, opts) {
    fastify.register(import('@fastify/helmet'), {
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      crossOriginEmbedderPolicy: { policy: 'credentialless' },
      contentSecurityPolicy: {
        directives: {
          'media-src': '*',
          'img-src': '*',
          'upgrade-insecure-requests': upgradeInsecureRequests
        }
      }
    })
    fastify.register(import('@fastify/static'), {
      root: path.join(__dirname, '../public/archives/view'),
      prefix: '/',
      ...staticOpts
    })
  }, { prefix: '/archives/view' })
}, {
  name: 'static',
  dependencies: ['compress', 'auth', 'jwt', 'helmet']
})
