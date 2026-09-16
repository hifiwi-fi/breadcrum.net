import SQL from '@nearform/sql'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 * @import { FastifyRequest, FastifyReply, FastifyBaseLogger } from 'fastify'
 * @import { QueryResult } from 'pg'
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
    const { feed: feedId } = /** @type {{feed?: string}} */ (request.params)
    if (!feedId) throw new Error('Missing feedId')

    const feedQuery = SQL`
      select pf.id, u.username
      from podcast_feeds pf
      join users u
      on u.id = pf.owner_id
      where pf.owner_id = ${uuid}
      and pf.id = ${feedId}
      and pf.token = ${token}
      fetch first 1 rows only
    `

    /** @type {QueryResult<{id: string, username: string}>} */
    const results = await fastify.pg.query(feedQuery)
    const authenticatedFeed = results.rows[0]
    if (results.rowCount === 1 && authenticatedFeed) {
      const authenticatedRequest = /** @type {FastifyRequest & {feedTokenUser: {userId: string, username: string, token: string} | null}} */ (request)
      authenticatedRequest.feedTokenUser = {
        userId: uuid,
        username: authenticatedFeed.username,
        token,
      }
      const requestLogger = /** @type {FastifyBaseLogger & {setBindings?: (bindings: Record<string, unknown>) => void}} */ (request.log)
      requestLogger.setBindings?.({
        userId: uuid,
        username: authenticatedFeed.username,
        feedId,
      })
    } else {
      throw new Error('Unauthorized feed token')
    }
  }
}
