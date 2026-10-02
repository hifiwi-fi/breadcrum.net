import { server } from '@passwordless-id/webauthn/dist/esm/index.js'
import SQL from '@nearform/sql'
import { verifyAndConsumeChallenge } from '../challenge-store.js'
import { schemaPasskeyAuthenticateVerifyBody } from '../schemas/schema-passkey-authenticate-verify.js'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 * @import { QueryResult } from 'pg'
 * @import { AuthenticationInfo, AuthenticationJSON, CredentialInfo, ExtendedAuthenticatorTransport, NamedAlgo } from '@passwordless-id/webauthn/dist/esm/types.js'
 */

/**
 * @typedef {Object} PasskeyRow
 * @property {string} id - Passkey UUID
 * @property {string} user_id - User UUID
 * @property {string} credential_id - WebAuthn credential ID
 * @property {string} public_key - Public key for verification
 * @property {NamedAlgo} algorithm - Algorithm (e.g., "ES256")
 * @property {string} counter - Current counter value
 * @property {ExtendedAuthenticatorTransport[] | null} transports - Transport hints for the credential
 */

/**
 * @typedef {Object} UserRow
 * @property {string} id - User UUID
 * @property {string} username - Username
 * @property {string} email - Email address
 * @property {boolean} email_confirmed - Whether email is confirmed
 * @property {boolean} newsletter_subscription - Newsletter subscription status
 * @property {boolean} admin - Admin status
 * @property {Date} created_at - Account creation date
 * @property {Date | null} updated_at - Last update date
 */

/**
  * @type {FastifyPluginAsyncJsonSchemaToTs<{
  *   SerializerSchemaOptions: {
  *     deserialize: [{ pattern: { type: 'string'; format: 'date-time'; }; output: Date | null; }]
  *   }
  * }>}
  */
export async function authenticationVerify (fastify, _opts) {
  /**
   * Extracts the WebAuthn signCount from authenticatorData.
   * @param {string | undefined} authenticatorData
   * @returns {number | null}
   */
  function getAuthenticatorSignCount (authenticatorData) {
    if (!authenticatorData || typeof authenticatorData !== 'string') return null
    const base64 = authenticatorData
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(authenticatorData.length + (4 - (authenticatorData.length % 4 || 4)), '=')

    let buffer
    try {
      buffer = Buffer.from(base64, 'base64')
    } catch {
      return null
    }

    if (buffer.length < 37) return null
    return buffer.readUInt32BE(33)
  }

  fastify.post(
    '/verify',
    {
      config: {
        rateLimit: {
          max: 10,
          timeWindow: '1 minute',
        },
      },
      schema: {
        tags: ['passkeys'],
        summary: 'Verify passkey authentication',
        description: 'Verify authentication payload from client.authenticate() and create session with JWT token',
        body: schemaPasskeyAuthenticateVerifyBody,
        response: {
          201: {
            type: 'object',
            required: ['token', 'user'],
            additionalProperties: false,
            properties: {
              token: {
                type: 'string',
                description: 'JWT token for authenticated session',
              },
              user: {
                type: 'object',
                required: ['id', 'username', 'email', 'email_confirmed', 'newsletter_subscription', 'admin', 'created_at', 'updated_at'],
                additionalProperties: false,
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  username: { type: 'string' },
                  email: { type: 'string' },
                  email_confirmed: { type: 'boolean' },
                  newsletter_subscription: { type: 'boolean' },
                  admin: { type: 'boolean' },
                  created_at: { type: 'string', format: 'date-time' },
                  updated_at: { type: 'string', format: 'date-time', nullable: true },
                },
              },
            },
          },
          400: { $ref: 'HttpError' },
          401: { $ref: 'HttpError' },
        },
      },
    },
    async function authenticationVerifyHandler (request, reply) {
      const { authentication } = request.body
      const { challenge, ...authenticationPayload } = authentication
      /** @type {AuthenticationJSON} */
      const authenticationJson = authenticationPayload

      // Extract credential ID and challenge from authentication payload
      const credentialId = authenticationJson.id

      if (!credentialId) {
        return reply.badRequest('Missing credential id in authentication payload')
      }

      if (!challenge) {
        return reply.badRequest('Missing challenge in authentication payload')
      }

      // Verify and consume challenge (single-use)
      const challengeData = await verifyAndConsumeChallenge(fastify, challenge, 'authenticate')

      if (!challengeData || typeof challengeData !== 'object') {
        return reply.unauthorized('Invalid or expired challenge')
      }

      // For conditional mediation, userId may not be in challenge
      // We'll look up the credential first to get the user_id
      const challengeUserId = ('userId' in challengeData && typeof challengeData.userId === 'string')
        ? challengeData.userId
        : null

      // Look up credential by credential_id (without user_id filter for conditional mediation)
      const credentialQuery = SQL`
        select
          id,
          user_id,
          credential_id,
          public_key,
          algorithm,
          counter,
          transports::text[]
        from passkeys
        where credential_id = ${credentialId}
        limit 1
      `

      /** @type {QueryResult<PasskeyRow>} */
      const credentialResult = await fastify.pg.query(credentialQuery)

      if (credentialResult.rowCount === 0) {
        return reply.unauthorized('Credential not found')
      }

      const storedPasskey = credentialResult.rows[0]
      if (!storedPasskey) {
        return reply.unauthorized('Credential not found')
      }

      const userId = storedPasskey.user_id
      const passkeyId = storedPasskey.id
      const storedCounter = parseInt(storedPasskey.counter, 10)
      const authenticatorSignCount = getAuthenticatorSignCount(authenticationJson.response.authenticatorData)
      const shouldCheckCounter = typeof authenticatorSignCount === 'number'
        ? authenticatorSignCount > 0
        : true

      // If challenge had userId (standard flow), verify it matches the credential's user
      if (challengeUserId && challengeUserId !== userId) {
        return reply.unauthorized('User mismatch between challenge and credential')
      }

      // Prepare credential for verification
      /** @type {CredentialInfo} */
      const credential = {
        id: storedPasskey.credential_id,
        publicKey: storedPasskey.public_key,
        algorithm: storedPasskey.algorithm,
        transports: storedPasskey.transports ?? [],
      }

      // Verify authentication with library
      // Origin must include protocol (e.g., "https://breadcrum.net")
      const origin = `${fastify.config.TRANSPORT}://${fastify.config.HOST}`
      const expected = {
        challenge,
        origin,
        userVerified: true,
        ...(shouldCheckCounter ? { counter: storedCounter } : {}),
      }

      /** @type {AuthenticationInfo} */
      let authInfo
      try {
        authInfo = await server.verifyAuthentication(authenticationJson, credential, expected)
      } catch (err) {
        const error = /** @type {Error} */ (err)
        fastify.log.error({ err, userId, credentialId }, 'Authentication verification failed')
        return reply.unauthorized(`Authentication verification failed: ${error.message}`)
      }

      // Extract new counter from authInfo
      // Note: The library returns parsed auth data, counter should have increased
      const newCounter = shouldCheckCounter
        ? authInfo.counter
        : storedCounter

      // Verify counter increased (additional safety check)
      if (shouldCheckCounter && newCounter <= storedCounter) {
        fastify.log.error({ userId, credentialId, storedCounter, newCounter }, 'Counter did not increase - possible replay attack')
        return reply.unauthorized('Invalid authenticator counter')
      }

      // Update counter and last_used in database
      const updateQuery = SQL`
        update passkeys
        set
          counter = ${newCounter},
          last_used = now()
        where id = ${passkeyId}
      `

      await fastify.pg.query(updateQuery)

      // Get user information
      const userQuery = SQL`
        select
          id,
          username,
          email,
          email_confirmed,
          newsletter_subscription,
          admin,
          created_at,
          updated_at
        from users
        where id = ${userId}
        limit 1
      `

      /** @type {QueryResult<UserRow>} */
      const userResult = await fastify.pg.query(userQuery)

      if (userResult.rowCount === 0) {
        return reply.unauthorized('User not found')
      }

      const user = userResult.rows[0]
      if (!user) {
        return reply.unauthorized('User not found')
      }

      // Create JWT token with passkey source
      const token = await reply.createJWTToken({ id: user.id, username: user.username }, 'passkey')
      reply.setJWTCookie(token)

      return reply.code(201).send({ token, user })
    }
  )
}
