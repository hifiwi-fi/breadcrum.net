/**
 * @import { FastifyRequest } from 'fastify'
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 */

/**
 * Capture raw request body for Stripe webhook signature verification.
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 */
export default async function billingWebhookHooks (fastify, _opts) {
  // Scoped parser override for this webhook subtree only:
  // Stripe signature verification requires raw bytes, but handlers still expect parsed JSON.
  fastify.removeContentTypeParser(['application/json'])
  fastify.addContentTypeParser('application/json', { parseAs: 'buffer' },
    /**
     * @param {FastifyRequest} request
     * @param {Buffer} payload
     * @param {(err: Error | null, body?: unknown) => void} done
     */
    function (request, payload, done) {
      const requestWithRawBody = /** @type {FastifyRequest & { rawBody?: Buffer }} */ (request)
      requestWithRawBody.rawBody = payload

      if (payload.length === 0) {
        done(null, {})
        return
      }

      try {
        const body = JSON.parse(payload.toString('utf8'))
        done(null, body)
      } catch (err) {
        done(/** @type {Error} */ (err))
      }
    })
}
