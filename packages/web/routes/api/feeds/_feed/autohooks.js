import SQL from '@nearform/sql'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@bret/type-provider-json-schema-to-ts'
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

  async function validate (uuid, token, request, reply) {
    if (!uuid) throw new Error('Missing user')
    if (!token) throw new Error('Missing password')
    const feedId = request?.params?.feed
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
      request.feedTokenUser = {
        userId: uuid,
        token,
      }
    } else {
      throw new Error('Unauthorized feed token')
    }
  }
}
