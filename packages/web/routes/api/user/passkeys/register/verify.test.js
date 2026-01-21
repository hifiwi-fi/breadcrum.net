import { test, suite } from 'node:test'
import assert from 'node:assert'
import { build } from '../../../../../test/helper.js'
import { createTestUser } from '../../auth-tokens/auth-tokens-test-utils.js'
import { storeChallenge } from '../challenge-store.js'
import { createTestPasskey, getPasskeyCount } from '../passkeys-test-utils.js'

/**
 * Note: These tests focus on server-side validation and error cases.
 * Valid WebAuthn registration payloads require cryptographic signatures from
 * actual authenticators, which can't be easily mocked. Full registration flow
 * testing requires browser integration tests with real authenticators.
 */

await suite('POST /api/user/passkeys/register/verify', async () => {
  await test('register verify - error cases', async (t) => {
    const app = await build(t)

    await t.test('returns 401 when not authenticated', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/user/passkeys/register/verify',
        payload: {
          registration: { challenge: 'test' },
          name: 'Test Passkey'
        }
      })

      assert.strictEqual(res.statusCode, 401, 'Should return 401 Unauthorized')
    })

    await t.test('returns 401 with invalid token', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/user/passkeys/register/verify',
        headers: {
          authorization: 'Bearer invalid-token'
        },
        payload: {
          registration: { challenge: 'test' },
          name: 'Test Passkey'
        }
      })

      assert.strictEqual(res.statusCode, 401, 'Should return 401 Unauthorized')
    })

    await t.test('returns 400 when missing registration object', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) assert.fail('Could not create a user')

      const res = await app.inject({
        method: 'POST',
        url: '/api/user/passkeys/register/verify',
        headers: {
          authorization: `Bearer ${user.token}`
        },
        payload: {
          name: 'Test Passkey'
        }
      })

      assert.strictEqual(res.statusCode, 400, 'Should return 400 Bad Request')
    })

    await t.test('returns 400 when missing name', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) assert.fail('Could not create a user')

      const res = await app.inject({
        method: 'POST',
        url: '/api/user/passkeys/register/verify',
        headers: {
          authorization: `Bearer ${user.token}`
        },
        payload: {
          registration: { challenge: 'test_challenge' }
        }
      })

      assert.strictEqual(res.statusCode, 400, 'Should return 400 Bad Request')
    })

    await t.test('returns 400 when name is too long', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) assert.fail('Could not create a user')

      const res = await app.inject({
        method: 'POST',
        url: '/api/user/passkeys/register/verify',
        headers: {
          authorization: `Bearer ${user.token}`
        },
        payload: {
          registration: { challenge: 'test_challenge' },
          name: 'a'.repeat(101) // Max is 100 characters
        }
      })

      assert.strictEqual(res.statusCode, 400, 'Should return 400 Bad Request')
    })

    await t.test('returns 400 when missing challenge in registration', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) assert.fail('Could not create a user')

      const res = await app.inject({
        method: 'POST',
        url: '/api/user/passkeys/register/verify',
        headers: {
          authorization: `Bearer ${user.token}`
        },
        payload: {
          registration: {}, // No challenge
          name: 'Test Passkey'
        }
      })

      assert.strictEqual(res.statusCode, 400, 'Should return 400 Bad Request')
      const body = JSON.parse(res.payload)
      assert.ok(body.message.includes('challenge'), 'Error should mention missing challenge')
    })

    await t.test('returns 400 when challenge is invalid/expired', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) assert.fail('Could not create a user')

      const res = await app.inject({
        method: 'POST',
        url: '/api/user/passkeys/register/verify',
        headers: {
          authorization: `Bearer ${user.token}`
        },
        payload: {
          registration: {
            challenge: 'non_existent_challenge'
          },
          name: 'Test Passkey'
        }
      })

      assert.strictEqual(res.statusCode, 400, 'Should return 400 Bad Request')
      const body = JSON.parse(res.payload)
      assert.ok(body.message.includes('Invalid or expired challenge'), 'Error should mention invalid challenge')
    })

    await t.test('returns 400 when challenge belongs to different user', async (t) => {
      const user1 = await createTestUser(app, t)
      const user2 = await createTestUser(app, t)
      if (!user1 || !user2) assert.fail('Could not create users')

      // Create challenge for user1
      const challenge = 'test_challenge_user1'
      await storeChallenge(app, challenge, {
        userId: user1.userId,
        type: 'register',
        createdAt: Date.now()
      })

      // Try to use user1's challenge with user2's token
      const res = await app.inject({
        method: 'POST',
        url: '/api/user/passkeys/register/verify',
        headers: {
          authorization: `Bearer ${user2.token}`
        },
        payload: {
          registration: {
            challenge
          },
          name: 'Test Passkey'
        }
      })

      assert.strictEqual(res.statusCode, 400, 'Should return 400 Bad Request')
      const body = JSON.parse(res.payload)
      assert.ok(body.message.includes('does not belong'), 'Error should mention challenge ownership')
    })

    await t.test('returns 400 when challenge type is wrong', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) assert.fail('Could not create a user')

      // Create authenticate challenge (wrong type)
      const challenge = 'test_challenge_wrong_type'
      await storeChallenge(app, challenge, {
        userId: user.userId,
        type: 'authenticate', // Wrong type!
        createdAt: Date.now()
      })

      const res = await app.inject({
        method: 'POST',
        url: '/api/user/passkeys/register/verify',
        headers: {
          authorization: `Bearer ${user.token}`
        },
        payload: {
          registration: {
            challenge
          },
          name: 'Test Passkey'
        }
      })

      assert.strictEqual(res.statusCode, 400, 'Should return 400 Bad Request')
      const body = JSON.parse(res.payload)
      assert.ok(body.message.includes('Invalid or expired challenge'), 'Error should mention invalid challenge')
    })

    await t.test('returns 400 when user has reached max 10 passkeys', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) assert.fail('Could not create a user')

      // Create 10 passkeys for the user
      for (let i = 1; i <= 10; i++) {
        await createTestPasskey(app, user.userId, { name: `Passkey ${i}` })
      }

      // Verify user has 10 passkeys
      const count = await getPasskeyCount(app, user.userId)
      assert.strictEqual(count, 10, 'User should have 10 passkeys')

      // Create a valid challenge
      const challenge = 'test_challenge_max_reached'
      await storeChallenge(app, challenge, {
        userId: user.userId,
        type: 'register',
        createdAt: Date.now()
      })

      // Try to register 11th passkey
      const res = await app.inject({
        method: 'POST',
        url: '/api/user/passkeys/register/verify',
        headers: {
          authorization: `Bearer ${user.token}`
        },
        payload: {
          registration: {
            challenge
          },
          name: 'Passkey 11'
        }
      })

      assert.strictEqual(res.statusCode, 400, 'Should return 400 Bad Request')
      const body = JSON.parse(res.payload)
      assert.ok(body.message.includes('Maximum of 10 passkeys'), 'Error should mention max limit')
    })

    await t.test('returns 400 with invalid registration payload', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) assert.fail('Could not create a user')

      // Create a valid challenge
      const challenge = 'test_challenge_invalid_payload'
      await storeChallenge(app, challenge, {
        userId: user.userId,
        type: 'register',
        createdAt: Date.now()
      })

      // Try to verify with invalid registration payload
      // (missing required WebAuthn fields)
      const res = await app.inject({
        method: 'POST',
        url: '/api/user/passkeys/register/verify',
        headers: {
          authorization: `Bearer ${user.token}`
        },
        payload: {
          registration: {
            challenge,
            // Missing all other required WebAuthn fields
            // (id, rawId, response, etc.)
          },
          name: 'Test Passkey'
        }
      })

      assert.strictEqual(res.statusCode, 400, 'Should return 400 Bad Request')
      const body = JSON.parse(res.payload)
      assert.ok(body.message.includes('Registration verification failed'), 'Error should mention verification failure')
    })

    await t.test('challenge is consumed even on validation failure', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) assert.fail('Could not create a user')

      // Create a valid challenge
      const challenge = 'test_challenge_consumed'
      await storeChallenge(app, challenge, {
        userId: user.userId,
        type: 'register',
        createdAt: Date.now()
      })

      // First attempt with invalid payload
      await app.inject({
        method: 'POST',
        url: '/api/user/passkeys/register/verify',
        headers: {
          authorization: `Bearer ${user.token}`
        },
        payload: {
          registration: {
            challenge,
          },
          name: 'Test Passkey'
        }
      })

      // Second attempt with same challenge should fail (challenge consumed)
      const res = await app.inject({
        method: 'POST',
        url: '/api/user/passkeys/register/verify',
        headers: {
          authorization: `Bearer ${user.token}`
        },
        payload: {
          registration: {
            challenge,
          },
          name: 'Test Passkey'
        }
      })

      assert.strictEqual(res.statusCode, 400, 'Should return 400 Bad Request')
      const body = JSON.parse(res.payload)
      assert.ok(body.message.includes('Invalid or expired challenge'), 'Challenge should be consumed')
    })
  })

  await test('register verify - validation cases', async (t) => {
    const app = await build(t)

    await t.test('accepts name at minimum length (1 character)', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) assert.fail('Could not create a user')

      const challenge = 'test_challenge_min_name'
      await storeChallenge(app, challenge, {
        userId: user.userId,
        type: 'register',
        createdAt: Date.now()
      })

      const res = await app.inject({
        method: 'POST',
        url: '/api/user/passkeys/register/verify',
        headers: {
          authorization: `Bearer ${user.token}`
        },
        payload: {
          registration: {
            challenge
          },
          name: 'A' // Minimum 1 character
        }
      })

      // Will fail at WebAuthn verification, but passes name validation
      assert.strictEqual(res.statusCode, 400, 'Should fail at WebAuthn verification')
      const body = JSON.parse(res.payload)
      assert.ok(!body.message.includes('name'), 'Should not complain about name length')
    })

    await t.test('accepts name at maximum length (100 characters)', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) assert.fail('Could not create a user')

      const challenge = 'test_challenge_max_name'
      await storeChallenge(app, challenge, {
        userId: user.userId,
        type: 'register',
        createdAt: Date.now()
      })

      const res = await app.inject({
        method: 'POST',
        url: '/api/user/passkeys/register/verify',
        headers: {
          authorization: `Bearer ${user.token}`
        },
        payload: {
          registration: {
            challenge
          },
          name: 'a'.repeat(100) // Maximum 100 characters
        }
      })

      // Will fail at WebAuthn verification, but passes name validation
      assert.strictEqual(res.statusCode, 400, 'Should fail at WebAuthn verification')
      const body = JSON.parse(res.payload)
      assert.ok(!body.message.includes('name'), 'Should not complain about name length')
    })
  })

  // Note: Testing successful registration with valid WebAuthn payloads requires
  // actual cryptographic signatures from authenticators, which can't be easily
  // mocked. This would require:
  // 1. Browser integration tests with real authenticators
  // 2. OR a mock implementation of the @passwordless-id/webauthn library
  // 3. OR pre-generated valid registration payloads (but these are origin-specific)
  //
  // For now, we focus on server-side validation and error handling tests above.
  // Full registration flow should be tested in end-to-end browser tests.
})
