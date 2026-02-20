/**
 * @import { JSONSchema } from 'json-schema-to-ts'
 */
import fp from 'fastify-plugin'

export const helmetEnvSchema = /** @type {const} @satisfies {JSONSchema} */ ({
  properties: {
    SECURE_IFRAMES: { type: 'boolean', default: false },
  },
  required: [],
})

/**
 * This plugin adds fastify/fastify-helmet
 *
 * @see https://github.com/fastify/fastify-helmet
 */

export default fp(async function (fastify, _) {
  // This is also customized in the ./static.js plugin
  const frameSrc = [
    'https://giscus.app',
    'https://platform.twitter.com',
    'https://fosstodon.org',
    'https://embed.bsky.app',
    'https://challenges.cloudflare.com',
    'https://www.youtube.com',
    'https://www.youtube-nocookie.com',
    'https://player.vimeo.com',
    'https://w.soundcloud.com',
    'https://open.spotify.com',
    'https://geo.dailymotion.com',
    'https://rumble.com',
  ]

  /** @type {{ policy?: 'require-corp' | 'credentialless' | 'unsafe-none' } | false} */
  const crossOriginEmbedderPolicy = fastify.config.SECURE_IFRAMES
    ? { policy: 'credentialless' }
    : false

  fastify.register(import('@fastify/helmet'), {
    crossOriginResourcePolicy: { policy: 'same-origin' },
    crossOriginEmbedderPolicy,
    contentSecurityPolicy: {
      directives: {
        'upgrade-insecure-requests': fastify.config.ENV !== 'production' ? null : [],
        'media-src': '*',
        'img-src': ['*', 'data:'],
        'connect-src': [
          "'self'",
          'https://analytics.ahrefs.com',
        ],
        'frame-src': frameSrc,
        'script-src': [
          "'self'", // Allow scripts from the same origin
          'https://platform.twitter.com', // Allow all scripts from platform.twitter.com
          'https://fosstodon.org/embed.js',
          'https://embed.bsky.app/static/embed.js',
          'https://analytics.ahrefs.com',
          'https://challenges.cloudflare.com',
        ],
      },
    },
  })
}, {
  name: 'helmet',
  dependencies: ['env'],
})
