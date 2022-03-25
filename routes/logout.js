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
      if (request.session.get('userId')) {
        request.session.delete()
        return {
          logged_out: true
        }
      } else {
        return fastify.httpErrors.unauthorized()
      }
    }
  )
}
