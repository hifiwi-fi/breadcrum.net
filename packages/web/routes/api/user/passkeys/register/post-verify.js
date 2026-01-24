import { server } from '@passwordless-id/webauthn'
import SQL from '@nearform/sql'
import { verifyAndConsumeChallenge } from '../challenge-store.js'
import { schemaPasskeyRead } from '../schemas/schema-passkey-read.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 * @import { QueryResult } from 'pg'
 * @import { TypePasskeyReadSerialize } from '../schemas/schema-passkey-read.js'
 */

/**
 * @type {FastifyPluginAsyncJsonSchemaToTs<{
 *   SerializerSchemaOptions: {
 *     deserialize: [{ pattern: { type: 'string'; format: 'date-time'; }; output: Date | null; }]
 *   }
 * }>}
 */
export async function registrationVerify (fastify, _opts) {
  fastify.post(
    '/verify',
    {
      preHandler: fastify.auth([fastify.verifyJWT]),
      schema: {
        tags: ['passkeys'],
        summary: 'Verify passkey registration',
        description: 'Verify registration payload from client.register() and store the passkey credential',
        body: {
          type: 'object',
          required: ['registration', 'name'],
          properties: {
            registration: {
              type: 'object',
              description: 'Registration payload from client.register()',
            },
            name: {
              type: 'string',
              minLength: 1,
              maxLength: 100,
              description: 'User-defined name for the passkey',
            },
          },
        },
        response: {
          201: schemaPasskeyRead,
          400: { $ref: 'HttpError' },
        },
      },
    },
    async function registrationVerifyHandler (request, reply) {
      const userId = request.user.id
      const { registration, name } = request.body

      // Extract challenge from registration payload
      const challenge = registration['challenge']

      if (!challenge) {
        return reply.badRequest('Missing challenge in registration payload')
      }

      // Verify and consume challenge (single-use)
      const challengeData = await verifyAndConsumeChallenge(fastify, /** @type {string} */ (challenge), 'register')

      if (!challengeData || typeof challengeData !== 'object') {
        return reply.badRequest('Invalid or expired challenge')
      }

      if (!('userId' in challengeData) || typeof challengeData.userId !== 'string') {
        return reply.badRequest('Invalid challenge data')
      }

      // Verify the challenge belongs to this user
      if (challengeData.userId !== userId) {
        return reply.badRequest('Challenge does not belong to this user')
      }

      // Check passkey limit (configurable max per user)
      const countQuery = SQL`
        select count(*) as count
        from passkeys
        where user_id = ${userId}
      `

      /** @type {QueryResult<{ count: string }>} */
      const countResult = await fastify.pg.query(countQuery)
      const passkeyCount = parseInt(countResult.rows[0]?.count ?? '0', 10)

      const maxPasskeys = fastify.config.PASSKEY_MAX_PER_USER || 10
      if (passkeyCount >= maxPasskeys) {
        return reply.badRequest(`Maximum of ${maxPasskeys} passkeys per user reached`)
      }

      // Verify registration with library
      // Origin must include protocol (e.g., "https://breadcrum.net")
      const origin = `${fastify.config.TRANSPORT}://${fastify.config.HOST}`
      const expected = {
        challenge,
        origin,
      }

      let registrationInfo
      try {
        // @ts-expect-error - registration object from client, library handles validation
        registrationInfo = await server.verifyRegistration(registration, expected)
      } catch (err) {
        const error = /** @type {Error} */ (err)
        fastify.log.error({ err, userId }, 'Registration verification failed')
        return reply.badRequest(`Registration verification failed: ${error.message}`)
      }

      // Extract credential data
      const credentialId = registrationInfo.credential.id
      const publicKey = registrationInfo.credential.publicKey
      const algorithm = registrationInfo.credential.algorithm
      const transports = registrationInfo.credential.transports || null
      const counter = registrationInfo.authenticator.counter
      const aaguid = registrationInfo.authenticator.aaguid || null

      // Store passkey in database
      const insertQuery = SQL`
        insert into passkeys (
          user_id,
          credential_id,
          public_key,
          algorithm,
          counter,
          transports,
          aaguid,
          name,
          created_at
        )
        values (
          ${userId},
          ${credentialId},
          ${publicKey},
          ${algorithm},
          ${counter},
          ${transports ? SQL`${transports}::authenticator_transport[]` : SQL`null`},
          ${aaguid},
          ${name},
          now()
        )
        returning
          id,
          credential_id,
          name,
          created_at,
          updated_at,
          last_used,
          transports::text[],
          aaguid
      `

      /** @type {QueryResult<TypePasskeyReadSerialize>} */
      const result = await fastify.pg.query(insertQuery)

      const passkey = result.rows[0]
      if (!passkey) {
        return reply.internalServerError('Passkey creation failed')
      }

      return reply.code(201).send(passkey)
    }
  )
}
