import SQL from '@nearform/sql'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 * @import { FastifyRequest, FastifyReply } from 'fastify'
 */

/**
 *
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 * @returns {Promise<void>}
 */
export default async function (fastify, _opts) {
  // Add basic auth for feed and feed episode routes
  fastify.register(import('@fastify/basic-auth'), {
    validate,
    authenticate: true,
  })

  fastify.decorateRequest('feedTokenUser', null)

  /**
   * Validates feed token authentication
   * @param {string} uuid - User ID from basic auth
   * @param {string} token - Feed token from basic auth
   * @param {FastifyRequest} request - Fastify request object
   * @param {FastifyReply} _reply - Fastify reply object (unused)
   */
  async function validate (uuid, token, request, _reply) {
    if (!uuid) throw new Error('Missing user')
    if (!token) throw new Error('Missing password')
    // TODO: Fix ANY
    const feedId = /** @type {any} */ (request?.params)?.feed
    if (!feedId) throw new Error('Missing feedId')

    const feedQuery = SQL`
      select pf.id
      from podcast_feeds pf
      where pf.owner_id = ${uuid}
      and pf.id = ${feedId}
      and pf.token = ${token}
      fetch first 1 rows only
    `

    const results = await fastify.pg.query(feedQuery)
    if (results.rowCount === 1) {
      // TODO: Fix ANY
      /** @type {any} */ (request).feedTokenUser = {
        userId: uuid,
        token,
      }
    } else {
      throw new Error('Unauthorized feed token')
    }
  }
}
