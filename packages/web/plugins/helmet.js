import fp from 'fastify-plugin'

/**
 * This plugin adds fastify/fastify-helmet
 *
 * @see https://github.com/fastify/fastify-helmet
 */

export default fp(async function (fastify, _) {
  // This is also customized in the ./static.js plugin
  fastify.register(import('@fastify/helmet'), {
    crossOriginResourcePolicy: { policy: 'same-origin' },
    crossOriginEmbedderPolicy: { policy: 'credentialless' },
    contentSecurityPolicy: {
      directives: {
        'upgrade-insecure-requests': fastify.config.ENV !== 'production' ? null : [],
        'media-src': '*',
        'img-src': ['*', 'data:'],
        'frame-src': [
          'https://giscus.app',
          'https://platform.twitter.com',
          'https://fosstodon.org',
          'https://embed.bsky.app',
        ],
        'script-src': [
          "'self'", // Allow scripts from the same origin
          'https://platform.twitter.com', // Allow all scripts from platform.twitter.com
          'https://fosstodon.org/embed.js',
          'https://embed.bsky.app/static/embed.js',
          'https://analytics.ahrefs.com',
        ],
      },
    },
  })
}, {
  name: 'helmet',
  dependencies: ['env'],
})
