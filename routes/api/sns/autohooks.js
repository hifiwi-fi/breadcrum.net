import jsonParser from 'fast-json-body'

export default async function (fastify, opts) {
  // Add basic auth for feed and feed episode routes
  fastify.register(import('@fastify/basic-auth'), {
    validate,
    authenticate: true
  })

  async function validate (snsUser, snsPass, request, reply) {
    if (!fastify.config.SNS_PASS) throw new Error('Missing SNS_PASS ENV var')

    if (snsUser !== fastify.config.SNS_USER) throw new Error('Unknown SNS user')
    if (snsPass !== fastify.config.SNS_PASS) throw new Error('Bad password')
  }

  fastify.removeContentTypeParser(['text/plain'])

  fastify.addContentTypeParser('text/plain', function (request, payload, done) {
    jsonParser(payload, function (err, body) {
      done(err, body)
    })
  })
}
