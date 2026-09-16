/**
 * @import { FastifyRequest, FastifyReply } from 'fastify'
 */

// @ts-ignore
import jsonParser from 'fast-json-body'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
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

  /**
   * @param  {string} snsUser
   * @param  {string} snsPass
   * @param  {FastifyRequest} _request
   * @param  {FastifyReply} _reply
   */
  async function validate (snsUser, snsPass, _request, _reply) {
    if (!fastify.config.SNS_PASS) throw new Error('Missing SNS_PASS ENV var')

    if (snsUser !== fastify.config.SNS_USER) throw new Error('Unknown SNS user')
    if (snsPass !== fastify.config.SNS_PASS) throw new Error('Bad password')
  }

  fastify.removeContentTypeParser(['text/plain'])

  // SNS Sends a JSON payload as text/pain, so lets just assume they will do that.``
  fastify.addContentTypeParser('text/plain', function (_request, payload, done) {
    jsonParser(payload,
      /**
       * @param  {Error} err
       * @param  {any} body
       */
      function (err, body) {
        done(err, body)
      })
  })
}
