import { fullArchivePropsWithBookmark } from './mixed-archive-props.js'
export async function putArchives (fastify, opts) {
  fastify.put(
    '/',
    {
      preHandler: fastify.auth([
        fastify.verifyJWT,
        fastify.notDisabled,
      ], {
        relation: 'and',
      }),
      schema: {
        tags: ['archives'],
        querystring: {},
        response: {
          201: {
            type: 'object',
            properties: {
              data: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    ...fullArchivePropsWithBookmark,
                  },
                },
              },
            },
          },
        },
      },
    },
    async function putArchivesHandler (request, reply) {
      return reply.notImplemented()
    }
  )
}
