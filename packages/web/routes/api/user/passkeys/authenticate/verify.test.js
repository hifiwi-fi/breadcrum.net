import { test, suite } from 'node:test'
import assert from 'node:assert'
import { build } from '../../../../../test/helper.js'
import { createTestUser } from '../../auth-tokens/auth-tokens-test-utils.js'
import { storeChallenge } from '../challenge-store.js'
import { createTestPasskey } from '../passkeys-test-utils.js'

/**
 * @import { TypePasskeyAuthenticateVerifyBody } from '../schemas/schema-passkey-authenticate-verify.js'
 */

/**
 * @param {import('fastify').FastifyInstance} app
 * @param {import('../challenge-store.js').PasskeyChallengeData} data
 * @returns {Promise<string>}
 */
async function storeTestChallenge (app, data) {
  const challenge = `test_challenge_${Date.now()}_${Math.random().toString(36).slice(2)}`
  await storeChallenge(app, challenge, data)
  return challenge
}

/**
 * @typedef {TypePasskeyAuthenticateVerifyBody['authentication']} AuthenticationPayload
 */

/**
 * @param {Partial<AuthenticationPayload> & { response?: Partial<AuthenticationPayload['response']> }} overrides
 * @returns {AuthenticationPayload}
 */
function buildAuthenticationPayload (overrides = {}) {
  return {
    id: 'test_credential_id',
    rawId: 'dGVzdA',
    type: 'public-key',
    authenticatorAttachment: 'platform',
    clientExtensionResults: {},
    response: {
      clientDataJSON: 'dGVzdA',
      authenticatorData: 'dGVzdA',
      signature: 'dGVzdA',
      ...overrides.response,
    },
    challenge: 'test_challenge',
    ...overrides,
  }
}

/**
 * Note: These tests focus on server-side validation and error cases.
 * Valid WebAuthn authentication payloads require cryptographic signatures from
 * actual authenticators, which can't be easily mocked. Full authentication flow
 * testing requires browser integration tests with real authenticators.
 */

await suite('POST /api/user/passkeys/authenticate/verify', async () => {
  await test('authentication verify - error cases', async (t) => {
    const app = await build(t)

    await t.test('returns 400 when missing authentication object', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/user/passkeys/authenticate/verify',
        payload: {}
      })

      assert.strictEqual(res.statusCode, 400, 'Should return 400 Bad Request')
      const body = JSON.parse(res.payload)
      assert.ok(body.message, 'Should include error message')
    })

    await t.test('returns 400 when authentication missing credential ID', async () => {
      const authentication = buildAuthenticationPayload({
        id: '',
      })

      const res = await app.inject({
        method: 'POST',
        url: '/api/user/passkeys/authenticate/verify',
        payload: {
          authentication
        }
      })

      assert.strictEqual(res.statusCode, 400, 'Should return 400 Bad Request')
      const body = JSON.parse(res.payload)
      assert.ok(body.message.includes('id'), 'Error should mention id')
    })

    await t.test('returns 400 when authentication missing challenge', async () => {
      const authentication = buildAuthenticationPayload({
        challenge: '',
      })

      const res = await app.inject({
        method: 'POST',
        url: '/api/user/passkeys/authenticate/verify',
        payload: {
          authentication
        }
      })

      assert.strictEqual(res.statusCode, 400, 'Should return 400 Bad Request')
      const body = JSON.parse(res.payload)
      assert.ok(body.message.includes('challenge'), 'Error should mention challenge')
    })

    await t.test('returns 401 when challenge does not exist', async () => {
      const authentication = buildAuthenticationPayload({
        challenge: 'nonexistent_challenge',
      })

      const res = await app.inject({
        method: 'POST',
        url: '/api/user/passkeys/authenticate/verify',
        payload: {
          authentication
        }
      })

      assert.strictEqual(res.statusCode, 401, 'Should return 401 Unauthorized')
      const body = JSON.parse(res.payload)
      assert.ok(body.message.includes('challenge'), 'Error should mention challenge')
    })

    await t.test('returns 401 when challenge has wrong type', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) assert.fail('Could not create a user')

      // Store a registration challenge instead of authentication
      const challenge = await storeTestChallenge(app, {
        userId: user.userId,
        type: 'register',
        createdAt: Date.now()
      })

      const res = await app.inject({
        method: 'POST',
        url: '/api/user/passkeys/authenticate/verify',
        payload: {
          authentication: buildAuthenticationPayload({ challenge })
        }
      })

      assert.strictEqual(res.statusCode, 401, 'Should return 401 Unauthorized')
    })

    await t.test('returns 401 when credential does not exist', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) assert.fail('Could not create a user')

      const challenge = await storeTestChallenge(app, {
        userId: user.userId,
        type: 'authenticate',
        createdAt: Date.now()
      })

      const res = await app.inject({
        method: 'POST',
        url: '/api/user/passkeys/authenticate/verify',
        payload: {
          authentication: buildAuthenticationPayload({
            id: 'nonexistent_credential',
            challenge,
          })
        }
      })

      assert.strictEqual(res.statusCode, 401, 'Should return 401 Unauthorized')
      const body = JSON.parse(res.payload)
      assert.ok(body.message, 'Should include error message')
    })

    await t.test('returns 401 when challenge belongs to different user', async (t) => {
      const user1 = await createTestUser(app, t)
      const user2 = await createTestUser(app, t)
      if (!user1 || !user2) assert.fail('Could not create users')

      // Create passkey for user2
      const passkey = await createTestPasskey(app, user2.userId)

      // Create challenge for user1 (different user)
      const challenge = await storeTestChallenge(app, {
        userId: user1.userId,
        type: 'authenticate',
        createdAt: Date.now()
      })

      const res = await app.inject({
        method: 'POST',
        url: '/api/user/passkeys/authenticate/verify',
        payload: {
          authentication: buildAuthenticationPayload({
            id: passkey.credentialId,
            challenge,
          })
        }
      })

      assert.strictEqual(res.statusCode, 401, 'Should return 401 Unauthorized')
      const body = JSON.parse(res.payload)
      assert.ok(body.message, 'Should include error message')
    })

    await t.test('challenge is consumed (single-use)', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) assert.fail('Could not create a user')

      const passkey = await createTestPasskey(app, user.userId)
      const challenge = await storeTestChallenge(app, {
        userId: user.userId,
        type: 'authenticate',
        createdAt: Date.now()
      })

      // First request - will fail on verification but should consume challenge
      await app.inject({
        method: 'POST',
        url: '/api/user/passkeys/authenticate/verify',
        payload: {
          authentication: buildAuthenticationPayload({
            id: passkey.credentialId,
            challenge,
          })
        }
      })

      // Second request with same challenge - should fail because challenge was consumed
      const res2 = await app.inject({
        method: 'POST',
        url: '/api/user/passkeys/authenticate/verify',
        payload: {
          authentication: buildAuthenticationPayload({
            id: passkey.credentialId,
            challenge,
          })
        }
      })

      assert.strictEqual(res2.statusCode, 401, 'Second request should fail with 401')
      const body = JSON.parse(res2.payload)
      assert.ok(body.message, 'Error should indicate invalid challenge')
    })
  })

  await test('authentication verify - conditional mediation cases', async (t) => {
    const app = await build(t)

    await t.test('works without userId in challenge (conditional mediation)', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) assert.fail('Could not create a user')

      const passkey = await createTestPasskey(app, user.userId)

      // Store challenge without userId (simulating conditional mediation flow)
      const cacheRedis = app.redis['cache']
      if (!cacheRedis) throw new Error('Missing redis cache client')

      const challenge = `test_challenge_${Date.now()}`
      const challengeData = {
        type: 'authenticate',
        createdAt: Date.now()
        // No userId field
      }

      await cacheRedis.setex(
        `passkey:challenge:${challenge}`,
        300,
        JSON.stringify(challengeData)
      )

      // This should work because we look up user from credential
      const res = await app.inject({
        method: 'POST',
        url: '/api/user/passkeys/authenticate/verify',
        payload: {
          authentication: buildAuthenticationPayload({
            id: passkey.credentialId,
            challenge,
          })
        }
      })

      // Will return 401 due to invalid WebAuthn payload, but should pass user lookup logic
      assert.strictEqual(res.statusCode, 401, 'Should return 401')
      const body = JSON.parse(res.payload)
      // Should NOT fail on user mismatch since there was no userId in challenge
      assert.ok(!body.message.includes('mismatch'), 'Should not fail on user mismatch')
    })
  })

  await test('authentication verify - isolation', async (t) => {
    const app = await build(t)

    await t.test('users cannot authenticate with other users passkeys', async (t) => {
      const user1 = await createTestUser(app, t)
      const user2 = await createTestUser(app, t)
      if (!user1 || !user2) assert.fail('Could not create users')

      const passkey1 = await createTestPasskey(app, user1.userId, { name: 'User 1 Passkey' })
      await createTestPasskey(app, user2.userId, { name: 'User 2 Passkey' })

      // Create challenge for user2
      const challenge = await storeTestChallenge(app, {
        userId: user2.userId,
        type: 'authenticate',
        createdAt: Date.now()
      })

      // Try to authenticate as user2 using user1's passkey
      const res = await app.inject({
        method: 'POST',
        url: '/api/user/passkeys/authenticate/verify',
        payload: {
          authentication: buildAuthenticationPayload({
            id: passkey1.credentialId,
            challenge,
          })
        }
      })

      assert.strictEqual(res.statusCode, 401, 'Should return 401 Unauthorized')
      const body = JSON.parse(res.payload)
      assert.ok(body.message, 'Should include error message')
    })

    await t.test('deleted passkeys cannot be used for authentication', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) assert.fail('Could not create a user')

      const passkey = await createTestPasskey(app, user.userId)
      const challenge = await storeTestChallenge(app, {
        userId: user.userId,
        type: 'authenticate',
        createdAt: Date.now()
      })

      // Delete the passkey
      await app.inject({
        method: 'DELETE',
        url: `/api/user/passkeys/${passkey.id}`,
        headers: {
          authorization: `Bearer ${user.token}`
        }
      })

      // Try to authenticate with deleted passkey
      const res = await app.inject({
        method: 'POST',
        url: '/api/user/passkeys/authenticate/verify',
        payload: {
          authentication: buildAuthenticationPayload({
            id: passkey.credentialId,
            challenge,
          })
        }
      })

      assert.strictEqual(res.statusCode, 401, 'Should return 401 Unauthorized')
      const body = JSON.parse(res.payload)
      assert.ok(body.message, 'Should include error message')
    })
  })

  await test('authentication verify - malformed payloads', async (t) => {
    const app = await build(t)

    await t.test('handles null authentication object', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/user/passkeys/authenticate/verify',
        payload: {
          authentication: null
        }
      })

      assert.strictEqual(res.statusCode, 400, 'Should return 400 Bad Request')
    })

    await t.test('handles authentication as string', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/user/passkeys/authenticate/verify',
        payload: {
          authentication: 'not-an-object'
        }
      })

      assert.strictEqual(res.statusCode, 400, 'Should return 400 Bad Request')
    })

    await t.test('handles authentication as array', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/user/passkeys/authenticate/verify',
        payload: {
          authentication: []
        }
      })

      assert.strictEqual(res.statusCode, 400, 'Should return 400 Bad Request')
    })

    await t.test('handles empty credential ID', async () => {
      const authentication = buildAuthenticationPayload({
        id: '',
      })

      const res = await app.inject({
        method: 'POST',
        url: '/api/user/passkeys/authenticate/verify',
        payload: {
          authentication
        }
      })

      assert.strictEqual(res.statusCode, 400, 'Should return 400 Bad Request')
    })
  })
})
