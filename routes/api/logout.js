import S from 'fluent-json-schema'

const logoutInfoSchema = S.object()
  .prop('logged_out', S.boolean())

export default async function logoutRoute (fastify, opts) {
  fastify.post(
    '/logout',
    {
      schema: {
        response: {
          200: logoutInfoSchema
        }
      }
    },
    async function (request, reply) {
      const hasUser = Boolean(request?.user?.id)
      reply.deleteJWTCookie()
      // TODO: delete auth_token in db
      if (hasUser) {
        return {
          logged_out: true
        }
      } else {
        return {
          logged_out: false
        }
      }
    }
  )
}
