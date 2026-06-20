import fp from 'fastify-plugin'
import path from 'path'

const __dirname = import.meta.dirname
const publicRoot = path.join(__dirname, '../public')

/**
 * @typedef {object} HeaderResponse
 * @property {(name: string, value: string) => void} setHeader
 */

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
    setHeaders: setStaticHeaders,
  }

  fastify.register(import('@fastify/static'), {
    logLevel: 'silent',
    root: publicRoot,
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

/**
 * @param {HeaderResponse} res
 * @param {string} filepath
 */
function setStaticHeaders (res, filepath) {
  const relname = path.relative(publicRoot, filepath).split(path.sep).join('/')

  // Browsers perform service worker update checks against this stable URL.
  // Do not let the static server or an intermediate cache hide a fresh worker.
  if (relname === 'service-worker.js') {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
    return
  }

  // Stable control files and generated HTML need revalidation. The service
  // worker handles offline freshness with content revisions in the manifest.
  if (
    relname === 'domstack-output-manifest.json' ||
    relname === 'manifest.webmanifest' ||
    relname === 'pwa-control.json' ||
    relname.endsWith('.html')
  ) {
    res.setHeader('Cache-Control', 'no-cache')
    return
  }

  // Hashed build outputs can be cached for a long time because filename changes
  // are already part of their invalidation model.
  if (isHashedStaticAsset(relname)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
  }
}

/**
 * @param {string} relname
 */
function isHashedStaticAsset (relname) {
  const basename = path.basename(relname)
  return relname.startsWith('chunks/') ||
    /\.[a-zA-Z0-9_-]{8,}\.(?:css|js|png|jpe?g|gif|webp|avif|svg|ico|woff2?)$/.test(basename)
}
