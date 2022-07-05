import SQL from '@nearform/sql'
import fp from 'fastify-plugin'
/**
 * This plugins adds @fastify/basic-auth
 *
 * @see https://github.com/fastify/fastify-basic-auth
 */
export default fp(async function (fastify, opts) {
  fastify.register(import('@fastify/basic-auth'), {
    validate,
    authenticate: true
  })

  fastify.decorateRequest('basicAuth', null)

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

    } else {
      throw new Error('Unauthorized')
    }
  }
}, {
  name: 'basic-auth',
  dependencies: ['env']
})
