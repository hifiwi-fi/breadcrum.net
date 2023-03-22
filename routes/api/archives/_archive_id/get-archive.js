/* eslint-disable camelcase */

import { getArchivesQuery } from '../archive-query-get.js'
import { fullArchivePropsWithBookmark } from '../mixed-archive-props.js'

export async function getArchive (fastify, opts) {
  fastify.get(
    '/',
    {
      preHandler: fastify.auth([fastify.verifyJWT]),
      schema: {
        querystring: {
          sensitive: {
            type: 'boolean',
            default: false
          }
        },
        params: {
          type: 'object',
          properties: {
            archive_id: { type: 'string', format: 'uuid' }
          },
          required: ['archive_id']
        },
        response: {
          200: {
            type: 'object',
            properties: {
              ...fullArchivePropsWithBookmark
            }
          }
        }
      }
    },
    async function getArchiveHandler (request, reply) {
      const ownerID = request.user.id
      const { archive_id: archiveID } = request.params
      const { sensitive } = request.query

      const archiveQuery = getArchivesQuery({
        ownerID,
        archiveID,
        sensitive,
        perPage: 1,
        fullArchives: true
      })

      const results = await fastify.pg.query(archiveQuery)
      const archive = results.rows[0]

      if (!archive) {
        return reply.notFound('archive_id not found')
      }

      return {
        ...archive
      }
    }
  )
}
