/**
 * @import { FastifyInstance } from 'fastify'
 */

import {
  blogAtomFeedString,
  blogJsonFeedString,
  giscusJson,
  manifestWebmanifest,
  opensearchXml,
  robotsTxt,
  serviceWorkerJs,
  sitemapXml,
} from './generated-responses.js'

/**
 * @param {FastifyInstance} fastify
 * @returns {Promise<void>}
 */
export async function registerGeneratedRoutes (fastify) {
  fastify.get('/robots.txt', generatedRouteSchema('text/plain'), async function robotsHandler (_request, reply) {
    return reply.type('text/plain; charset=utf-8').send(robotsTxt(fastify))
  })

  fastify.get('/opensearch.xml', generatedRouteSchema('application/opensearchdescription+xml'), async function opensearchHandler (_request, reply) {
    return reply.type('application/opensearchdescription+xml; charset=utf-8').send(opensearchXml(fastify))
  })

  fastify.get('/giscus.json', generatedRouteSchema('application/json'), async function giscusHandler (_request, reply) {
    return reply.type('application/json; charset=utf-8').send(giscusJson(fastify))
  })

  fastify.get('/manifest.webmanifest', generatedRouteSchema('application/manifest+json'), async function manifestHandler (_request, reply) {
    return reply.type('application/manifest+json; charset=utf-8').send(manifestWebmanifest(fastify))
  })

  fastify.get('/service-worker.js', generatedRouteSchema('application/javascript'), async function serviceWorkerHandler (_request, reply) {
    return reply.type('application/javascript; charset=utf-8').send(serviceWorkerJs(fastify))
  })

  fastify.get('/feed.json', generatedRouteSchema('application/feed+json'), async function jsonFeedHandler (_request, reply) {
    return reply.type('application/feed+json; charset=utf-8').send(await blogJsonFeedString(fastify))
  })

  fastify.get('/feed.xml', generatedRouteSchema('application/atom+xml'), async function atomFeedHandler (_request, reply) {
    return reply.type('application/atom+xml; charset=utf-8').send(await blogAtomFeedString(fastify))
  })

  fastify.get('/sitemap.xml', generatedRouteSchema('application/xml'), async function sitemapHandler (_request, reply) {
    return reply.type('application/xml; charset=utf-8').send(await sitemapXml(fastify))
  })
}

/**
 * @param {string} contentMediaType
 * @returns {object}
 */
function generatedRouteSchema (contentMediaType) {
  return {
    schema: {
      tags: ['generated'],
      response: {
        200: {
          type: 'string',
          contentMediaType,
        },
      },
    },
  }
}
